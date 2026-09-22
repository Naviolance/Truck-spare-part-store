import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { of } from "rxjs";
import { DemoReadOnlyInterceptor } from "./demo-read-only.interceptor";

function contextFor(method: string, user?: { isDemo?: boolean }) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ method, user }) }),
  } as unknown as ExecutionContext;
}

describe("DemoReadOnlyInterceptor", () => {
  const interceptor = new DemoReadOnlyInterceptor();
  let next: { handle: jest.Mock };

  beforeEach(() => {
    next = { handle: jest.fn(() => of("handler ran")) };
  });

  it.each(["GET", "HEAD", "OPTIONS"])("lets a demo account %s (reading is the whole point)", (method) => {
    interceptor.intercept(contextFor(method, { isDemo: true }), next);
    expect(next.handle).toHaveBeenCalled();
  });

  it.each(["POST", "PUT", "PATCH", "DELETE"])("blocks a demo account's %s before the handler runs", (method) => {
    expect(() => interceptor.intercept(contextFor(method, { isDemo: true }), next)).toThrow(ForbiddenException);
    expect(next.handle).not.toHaveBeenCalled();
  });

  it("explains why in the error, so the admin UI can show it", () => {
    expect(() => interceptor.intercept(contextFor("DELETE", { isDemo: true }), next)).toThrow(/read-only demo/);
  });

  it("never gets in the way of a normal admin", () => {
    interceptor.intercept(contextFor("DELETE", { isDemo: false }), next);
    expect(next.handle).toHaveBeenCalled();
  });

  it("ignores routes with no logged-in user (login, refresh, logout, webhooks)", () => {
    interceptor.intercept(contextFor("POST", undefined), next);
    expect(next.handle).toHaveBeenCalled();
  });
});
