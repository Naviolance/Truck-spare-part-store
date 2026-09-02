import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import type { Request, Response } from "express";

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
    const body = isHttpException
      ? exception.getResponse()
      : { statusCode: status, message: "Internal server error" };

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
    }

    res.status(status).json(body);
  }
}
