import { JwtService } from "@nestjs/jwt";
import { Reflector } from "@nestjs/core";
import type { ExecutionContext } from "@nestjs/common";
import { UserThrottlerGuard, INTERNAL_API_KEY_HEADER } from "./user-throttler.guard";

// getTracker/shouldSkip are protected; reach them for the test only.
type Exposed = {
  getTracker(req: Record<string, unknown>): Promise<string>;
  shouldSkip(ctx: ExecutionContext): Promise<boolean>;
};

const SECRET = "test-secret";

function makeGuard(): Exposed {
  const guard = new UserThrottlerGuard([{ ttl: 60_000, limit: 10 }], {} as never, new Reflector());
  return guard as unknown as Exposed;
}

function ctxWithHeaders(headers: Record<string, string>): ExecutionContext {
  return { switchToHttp: () => ({ getRequest: () => ({ headers }) }) } as unknown as ExecutionContext;
}

describe("UserThrottlerGuard", () => {
  const originalEnv = { ...process.env };
  beforeEach(() => {
    process.env.JWT_SECRET = SECRET;
    delete process.env.INTERNAL_API_KEY;
  });
  afterAll(() => {
    process.env = originalEnv;
  });

  it("buckets a valid token by user id, not IP", async () => {
    const token = new JwtService().sign({ sub: "user-1" }, { secret: SECRET });
    const tracker = await makeGuard().getTracker({ ip: "1.2.3.4", headers: { authorization: `Bearer ${token}` } });
    expect(tracker).toBe("user:user-1");
  });

  it("two users behind the same IP get separate buckets", async () => {
    const jwt = new JwtService();
    const guard = makeGuard();
    const a = await guard.getTracker({ ip: "1.2.3.4", headers: { authorization: `Bearer ${jwt.sign({ sub: "a" }, { secret: SECRET })}` } });
    const b = await guard.getTracker({ ip: "1.2.3.4", headers: { authorization: `Bearer ${jwt.sign({ sub: "b" }, { secret: SECRET })}` } });
    expect(a).not.toBe(b);
  });

  it("falls back to IP for a forged token (can't mint buckets)", async () => {
    const forged = new JwtService().sign({ sub: "anyone" }, { secret: "wrong-secret" });
    const tracker = await makeGuard().getTracker({ ip: "1.2.3.4", headers: { authorization: `Bearer ${forged}` } });
    expect(tracker).toBe("ip:1.2.3.4");
  });

  it("falls back to IP for anonymous requests", async () => {
    expect(await makeGuard().getTracker({ ip: "5.6.7.8", headers: {} })).toBe("ip:5.6.7.8");
  });

  it("skips throttling only for the correct internal key", async () => {
    process.env.INTERNAL_API_KEY = "internal-key-123";
    const guard = makeGuard();
    expect(await guard.shouldSkip(ctxWithHeaders({ [INTERNAL_API_KEY_HEADER]: "internal-key-123" }))).toBe(true);
    expect(await guard.shouldSkip(ctxWithHeaders({ [INTERNAL_API_KEY_HEADER]: "internal-key-124" }))).toBe(false);
    expect(await guard.shouldSkip(ctxWithHeaders({}))).toBe(false);
  });

  it("never skips when no internal key is configured", async () => {
    expect(await makeGuard().shouldSkip(ctxWithHeaders({ [INTERNAL_API_KEY_HEADER]: "" }))).toBe(false);
  });
});
