import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { DEMO_READ_ONLY_MESSAGE } from "../../auth/demo-accounts";

// Methods that only read data. Anything else changes something.
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Registered globally (app.module.ts), so it covers every route, including
// ones added later, without touching each controller's @Roles().
//
// It's an interceptor rather than a global guard on purpose: global guards
// run BEFORE a controller's JwtAuthGuard has attached request.user, while
// interceptors run after all guards, so the user (and its isDemo flag from
// the JWT) is known here.
//
// Routes without JwtAuthGuard (login, refresh, logout, webhooks) never have
// request.user set, so they pass through untouched, which is what lets a demo
// visitor log in and out normally.
@Injectable()
export class DemoReadOnlyInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    if (request.user?.isDemo && !SAFE_METHODS.has(request.method)) {
      throw new ForbiddenException(DEMO_READ_ONLY_MESSAGE);
    }
    return next.handle();
  }
}
