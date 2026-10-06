import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import type { Request, Response } from "express";
import * as Sentry from "@sentry/node";
import { defaultCode } from "../errors";

// Nest already sanitizes unhandled errors before they reach the client (no
// stack trace leaks), but its default logging is a single unstructured
// line. This gives every unexpected failure a consistent, grep-able shape —
// [ERROR] timestamp METHOD /path status - message — plus the full stack
// server-side, without changing what the client ever sees.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = normalizeBody(status, isHttpException ? exception.getResponse() : "Internal server error");

    // Expected client errors (validation, not-found, unauthorized, etc.)
    // aren't worth logging as errors — they're normal application traffic
    // and the client already sees exactly why. Only genuinely unexpected
    // failures (5xx, or anything that isn't a recognized HttpException at
    // all — a raw JS/Prisma error) get logged here.
    if (status >= 500) {
      const message = exception instanceof Error ? exception.message : String(exception);
      const stack = exception instanceof Error ? exception.stack : undefined;
      console.error(
        `[ERROR] ${new Date().toISOString()} ${req.method} ${req.originalUrl} ${status} - ${message}`,
      );
      if (stack) console.error(stack);
      // Expected 4xx are normal traffic; only real failures go to Sentry.
      Sentry.captureException(exception);
    }

    res.status(status).json(body);
  }
}

// Every error leaves in one shape: { statusCode, code, message, params? }.
// Handlers that used apiError() already chose a code; everything else
// (class-validator's message arrays, the throttler's plain string, a
// guard's bare 404) gets one from its status, so the frontend can always
// translate (common/errors.ts).
function normalizeBody(status: number, response: string | object): Record<string, unknown> {
  const body: Record<string, unknown> =
    typeof response === "string" ? { message: response } : { ...(response as Record<string, unknown>) };
  const validation = status === 400 && Array.isArray(body.message);
  return { statusCode: status, ...body, code: typeof body.code === "string" ? body.code : defaultCode(status, validation) };
}
