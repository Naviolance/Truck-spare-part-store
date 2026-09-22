import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import { UsersService } from "../users/users.service";
import { PrismaService } from "../common/prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { isDemoEmail } from "./demo-accounts";

const BCRYPT_ROUNDS = 12; // higher = slower to brute-force, 12 is a solid modern default
const SESSION_TOKEN_BYTES = 64;
const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Two independent, server-enforced limits on a session — checked on every
// touchSession() call:
//   - SESSION_INACTIVITY_MS: sliding. Must be touched at least this often or
//     it's treated as the user having genuinely left — this is what makes
//     "logged out only if inactive" actually true.
//   - SESSION_ABSOLUTE_MS: fixed from the ORIGINAL login, never extended by
//     rotation — a backstop so a session can't be kept alive forever by
//     activity alone (e.g. a stolen token used sporadically for months).
export const SESSION_INACTIVITY_MS = 60 * 60 * 1000;
export const SESSION_ABSOLUTE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// A replayed already-rotated token is what theft looks like — but it's also
// exactly what two near-simultaneous LEGITIMATE calls produce (two tabs, a
// page whose mount effect double-fires, a flaky-network retry): both read
// the same not-yet-rotated row, one wins the race and rotates it, the other
// arrives a beat later and finds it already revoked. Only escalate to "nuke
// every session" once a replay is too old to plausibly be that race —
// see touchSession()'s revokedAt branch.
const REUSE_GRACE_MS = 10_000;

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException("An account with this email already exists");
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });

    return this.createSession(user.id, user.role, user.email);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    const genericError = () => new UnauthorizedException("Invalid email or password");

    if (!user) throw genericError();

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) throw genericError();

    return this.createSession(user.id, user.role, user.email);
  }

  // Called once, at login/register — issues the ONE session token that will
  // be reused, unchanged, for the entire session's lifetime (see the Session
  // model comment in schema.prisma for why nothing rotates it).
  private async createSession(userId: string, role: string, email: string) {
    const accessToken = this.signAccessToken(userId, role, email);

    const sessionTokenPlain = crypto.randomBytes(SESSION_TOKEN_BYTES).toString("hex");
    const tokenHash = this.hashToken(sessionTokenPlain);
    const now = new Date();

    await this.prisma.session.create({
      data: {
        userId,
        tokenHash,
        lastActiveAt: now,
        expiresAt: new Date(now.getTime() + SESSION_ABSOLUTE_MS),
      },
    });

    return { accessToken, sessionToken: sessionTokenPlain };
  }

  // Demo accounts get a `demo` claim inside the signed token, so every later
  // request knows it's read-only without a DB lookup, and nobody can strip
  // the flag without invalidating the signature. Omitted for normal users.
  private signAccessToken(userId: string, role: string, email: string) {
    return this.jwtService.sign({
      sub: userId,
      role,
      ...(isDemoEmail(email) && { demo: true }),
    });
  }

  private hashToken(token: string) {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  // Called whenever the frontend needs a fresh access token — on mount, and
  // whenever apiFetch sees a 401 from an expired one. Rotates the session
  // token on every successful call: this is what makes a stolen-and-replayed
  // token detectable at all (see the revokedAt branch below). The absolute
  // expiry is carried over unchanged from the original session, not reset —
  // rotation extends the inactivity window, never the 30-day hard cap.
  async touchSession(sessionTokenPlain: string) {
    const tokenHash = this.hashToken(sessionTokenPlain);
    const session = await this.prisma.session.findUnique({ where: { tokenHash } });

    const invalid = () => new UnauthorizedException("Session expired, please log in again");
    if (!session || session.expiresAt < new Date()) throw invalid();

    if (session.revokedAt) {
      const revokedRecently = Date.now() - session.revokedAt.getTime() < REUSE_GRACE_MS;
      if (!revokedRecently) {
        // Replayed well after rotation — too old to be the benign race
        // above. Treat as theft: kill every session this user has.
        await this.prisma.session.updateMany({
          where: { userId: session.userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      throw invalid();
    }

    if (Date.now() - session.lastActiveAt.getTime() > SESSION_INACTIVITY_MS) {
      await this.prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
      throw invalid();
    }

    const user = await this.usersService.findById(session.userId);
    if (!user) throw invalid();

    const newSessionTokenPlain = crypto.randomBytes(SESSION_TOKEN_BYTES).toString("hex");
    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.session.update({ where: { id: session.id }, data: { revokedAt: now } }),
      this.prisma.session.create({
        data: {
          userId: session.userId,
          tokenHash: this.hashToken(newSessionTokenPlain),
          lastActiveAt: now,
          expiresAt: session.expiresAt, // absolute cap is NOT extended by rotation
        },
      }),
    ]);

    const accessToken = this.signAccessToken(user.id, user.role, user.email);
    // Callers (the /auth/refresh route) hand this straight to the frontend,
    // which already fetches this exact row via GET /users/me on the same
    // page load — returning it here lets the frontend skip that redundant
    // second round trip. Never send the hash back over the wire.
    const { passwordHash, ...safeUser } = user;
    return {
      accessToken,
      sessionToken: newSessionTokenPlain,
      user: { ...safeUser, isDemo: isDemoEmail(user.email) },
    };
  }

  async logout(sessionTokenPlain: string) {
    const tokenHash = this.hashToken(sessionTokenPlain);
    await this.prisma.session.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);

    // Deliberately do nothing different if the user doesn't exist — same
    // principle as login()'s genericError(). A different response here would
    // let anyone probe which emails have accounts on the site.
    if (!user) return;

    // A demo account's password is published on purpose; letting anyone
    // reset it would let one visitor lock everyone else out. Same silent
    // response as an unknown email, so this doesn't reveal anything either.
    if (isDemoEmail(user.email)) return;

    const tokenPlain = crypto.randomBytes(RESET_TOKEN_BYTES).toString("hex");
    const tokenHash = this.hashToken(tokenPlain);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${tokenPlain}`;
    await this.mailService.sendMail(
      user.email,
      "Reset your TruckParts password",
      `<p>Click the link below to reset your password. This link expires in 1 hour.</p>
       <p><a href="${resetUrl}">${resetUrl}</a></p>
       <p>If you didn't request this, you can safely ignore this email.</p>`,
    );
  }

  async resetPassword(tokenPlain: string, newPassword: string) {
    const tokenHash = this.hashToken(tokenPlain);
    const stored = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    const invalidLink = () => new UnauthorizedException("This reset link is invalid or has expired");
    if (!stored || stored.usedAt || stored.expiresAt < new Date()) throw invalidLink();

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    // All three or none: if the process died between updating the password
    // and marking the token used, a replay of the same link could reset the
    // password again.
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: stored.userId }, data: { passwordHash } }),
      this.prisma.passwordResetToken.update({ where: { id: stored.id }, data: { usedAt: new Date() } }),
      this.prisma.session.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }
}
