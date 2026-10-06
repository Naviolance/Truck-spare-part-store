import { ExecutionContext, Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { JwtService } from "@nestjs/jwt";
import { timingSafeEqual } from "crypto";

export const INTERNAL_API_KEY_HEADER = "x-internal-api-key";

// Rate-limit buckets, one per caller instead of one for the whole site.
//
// - Logged-in requests are keyed by user id. IP is a poor identity here:
//   mobile carriers put many phones behind one public IP (CGNAT), so an IP
//   bucket would throttle unrelated customers together.
// - Anonymous requests (login, register, browsing) are keyed by client IP,
//   which is only correct when main.ts's `trust proxy` matches the number of
//   proxies in front of the app (see TRUST_PROXY in README).
// - Our own Next.js server (SSR, sitemap) proves itself with INTERNAL_API_KEY
//   and isn't throttled: all visitors' page renders come from a handful of
//   Vercel IPs and would otherwise share one bucket.
//
// The token is VERIFIED, not just decoded: a decoded-only `sub` would let an
// attacker mint a fresh bucket per request by inventing user ids.
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  private jwt = new JwtService();

  protected async getTracker(req: { ip?: string; headers?: Record<string, unknown> }): Promise<string> {
    const userId = this.verifiedUserId(req.headers?.authorization);
    return userId ? `user:${userId}` : `ip:${req.ip}`;
  }

  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const expected = process.env.INTERNAL_API_KEY;
    if (!expected) return false;
    const provided = context.switchToHttp().getRequest().headers?.[INTERNAL_API_KEY_HEADER];
    if (typeof provided !== "string" || provided.length !== expected.length) return false;
    return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  }

  private verifiedUserId(authorization: unknown): string | null {
    if (typeof authorization !== "string" || !authorization.startsWith("Bearer ")) return null;
    try {
      const payload = this.jwt.verify<{ sub?: string }>(authorization.slice(7), {
        secret: process.env.JWT_SECRET,
      });
      return payload.sub ?? null;
    } catch {
      return null; // expired or forged: fall back to the IP bucket
    }
  }
}
