import { UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { AuthService, SESSION_INACTIVITY_MS } from "./auth.service";

function mockPrisma() {
  return {
    user: {
      update: jest.fn(),
    },
    passwordResetToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    session: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn((ops: any[]) => Promise.all(ops)),
  };
}

describe("AuthService", () => {
  let prisma: ReturnType<typeof mockPrisma>;
  let usersService: { findByEmail: jest.Mock; findById: jest.Mock };
  let jwtService: { sign: jest.Mock };
  let mailService: { sendMail: jest.Mock };
  let service: AuthService;

  beforeEach(() => {
    prisma = mockPrisma();
    usersService = { findByEmail: jest.fn(), findById: jest.fn() };
    jwtService = { sign: jest.fn().mockReturnValue("fake.jwt.token") };
    mailService = { sendMail: jest.fn().mockResolvedValue(undefined) };
    service = new AuthService(usersService as any, jwtService as any, prisma as any, mailService as any);
  });

  describe("forgotPassword", () => {
    it("does nothing observable for an email with no account — no token, no email", async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await service.forgotPassword("nobody@example.com");

      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
      expect(mailService.sendMail).not.toHaveBeenCalled();
    });

    it("creates a token and emails a link for a real account", async () => {
      usersService.findByEmail.mockResolvedValue({ id: "user-1", email: "real@example.com" });

      await service.forgotPassword("real@example.com");

      expect(prisma.passwordResetToken.create).toHaveBeenCalledTimes(1);
      expect(mailService.sendMail).toHaveBeenCalledWith(
        "real@example.com",
        expect.any(String),
        expect.stringContaining("reset-password?token="),
      );
    });

    it("never stores the plain token — only its hash", async () => {
      usersService.findByEmail.mockResolvedValue({ id: "user-1", email: "real@example.com" });

      await service.forgotPassword("real@example.com");

      const createArgs = prisma.passwordResetToken.create.mock.calls[0][0];
      const storedHash: string = createArgs.data.tokenHash;
      // Pull the plain token back out of the email body to compare.
      const emailBody: string = mailService.sendMail.mock.calls[0][2];
      const plainToken = emailBody.match(/token=([a-f0-9]+)/)?.[1];

      expect(plainToken).toBeDefined();
      expect(storedHash).not.toBe(plainToken);
      expect(storedHash).toHaveLength(64); // sha256 hex digest
    });
  });

  describe("resetPassword", () => {
    it("rejects an unknown token", async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue(null);
      await expect(service.resetPassword("bogus", "NewPass123!")).rejects.toThrow(UnauthorizedException);
    });

    it("rejects an expired token", async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: "token-1",
        userId: "user-1",
        usedAt: null,
        expiresAt: new Date(Date.now() - 1000),
      });
      await expect(service.resetPassword("expired", "NewPass123!")).rejects.toThrow(/invalid or has expired/);
    });

    it("rejects a token that was already used — this is what stops a leaked reset link being replayed", async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: "token-1",
        userId: "user-1",
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 1000 * 60),
      });
      await expect(service.resetPassword("already-used", "NewPass123!")).rejects.toThrow(/invalid or has expired/);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("updates the password, marks the token used, and revokes every existing session — all in one transaction", async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: "token-1",
        userId: "user-1",
        usedAt: null,
        expiresAt: new Date(Date.now() + 1000 * 60),
      });

      await service.resetPassword("valid-token", "NewPass123!");

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "user-1" } }),
      );
      expect(prisma.passwordResetToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "token-1" }, data: { usedAt: expect.any(Date) } }),
      );
      expect(prisma.session.updateMany).toHaveBeenCalledWith({
        where: { userId: "user-1", revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  describe("touchSession", () => {
    it("rejects an unknown token", async () => {
      prisma.session.findUnique.mockResolvedValue(null);
      await expect(service.touchSession("bogus")).rejects.toThrow(/expired/);
    });

    it("rejects a token past its absolute expiry, even if recently active", async () => {
      prisma.session.findUnique.mockResolvedValue({
        id: "s-1",
        userId: "user-1",
        lastActiveAt: new Date(), // active right now
        expiresAt: new Date(Date.now() - 1000), // but the 30-day cap already passed
        revokedAt: null,
      });
      await expect(service.touchSession("token")).rejects.toThrow(/expired/);
    });

    it("rejects and revokes a session that's been inactive past the inactivity window", async () => {
      prisma.session.findUnique.mockResolvedValue({
        id: "s-1",
        userId: "user-1",
        lastActiveAt: new Date(Date.now() - (SESSION_INACTIVITY_MS + 60_000)), // just past the window
        expiresAt: new Date(Date.now() + 1_000_000),
        revokedAt: null,
      });

      await expect(service.touchSession("token")).rejects.toThrow(/expired/);
      expect(prisma.session.update).toHaveBeenCalledWith({
        where: { id: "s-1" },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it("rotates a valid token: revokes the old one, creates a new one, and preserves the original absolute expiry", async () => {
      const originalExpiresAt = new Date(Date.now() + 1_000_000);
      prisma.session.findUnique.mockResolvedValue({
        id: "s-1",
        userId: "user-1",
        lastActiveAt: new Date(Date.now() - 60 * 1000), // active 1 minute ago
        expiresAt: originalExpiresAt,
        revokedAt: null,
      });
      usersService.findById.mockResolvedValue({ id: "user-1", role: "CUSTOMER" });

      const result = await service.touchSession("token");

      expect(prisma.session.update).toHaveBeenCalledWith({
        where: { id: "s-1" },
        data: { revokedAt: expect.any(Date) },
      });
      expect(prisma.session.create).toHaveBeenCalledWith({
        data: {
          userId: "user-1",
          tokenHash: expect.any(String),
          lastActiveAt: expect.any(Date),
          expiresAt: originalExpiresAt, // NOT extended by rotation
        },
      });
      expect(result).toEqual({
        accessToken: "fake.jwt.token",
        sessionToken: expect.any(String),
        user: { id: "user-1", role: "CUSTOMER", isDemo: false },
      });
    });

    it("a token reused moments after rotation fails, but does NOT nuke the winning call's new session", async () => {
      // This is the exact race two near-simultaneous refresh calls produce:
      // both read the same not-yet-rotated cookie, one wins and rotates it,
      // the other arrives a beat later and finds it already revoked.
      prisma.session.findUnique.mockResolvedValue({
        id: "s-1",
        userId: "user-1",
        lastActiveAt: new Date(),
        expiresAt: new Date(Date.now() + 1_000_000),
        revokedAt: new Date(Date.now() - 500), // revoked half a second ago
      });

      await expect(service.touchSession("just-rotated")).rejects.toThrow(/expired/);
      expect(prisma.session.updateMany).not.toHaveBeenCalled();
    });

    it("a token reused long after rotation IS treated as theft — revokes every session", async () => {
      prisma.session.findUnique.mockResolvedValue({
        id: "s-1",
        userId: "user-1",
        lastActiveAt: new Date(),
        expiresAt: new Date(Date.now() + 1_000_000),
        revokedAt: new Date(Date.now() - 60_000), // revoked a full minute ago
      });

      await expect(service.touchSession("old-replayed-token")).rejects.toThrow(/expired/);
      expect(prisma.session.updateMany).toHaveBeenCalledWith({
        where: { userId: "user-1", revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  describe("demo accounts (read-only, credentials published on purpose)", () => {
    const DEMO_EMAIL = "admin@truckparts.local"; // the default demo account

    async function userWithPassword(email: string, password: string) {
      return { id: "user-1", email, role: "ADMIN", passwordHash: await bcrypt.hash(password, 4) };
    }

    it("login puts a demo claim in the signed token for a demo account", async () => {
      usersService.findByEmail.mockResolvedValue(await userWithPassword(DEMO_EMAIL, "admin123"));

      await service.login({ email: DEMO_EMAIL, password: "admin123" });

      expect(jwtService.sign).toHaveBeenCalledWith({ sub: "user-1", role: "ADMIN", demo: true });
    });

    it("login leaves the demo claim out entirely for a normal account", async () => {
      usersService.findByEmail.mockResolvedValue(await userWithPassword("owner@example.com", "s3cret-pass"));

      await service.login({ email: "owner@example.com", password: "s3cret-pass" });

      expect(jwtService.sign).toHaveBeenCalledWith({ sub: "user-1", role: "ADMIN" });
    });

    it("refresh keeps the demo claim and tells the frontend isDemo: true", async () => {
      prisma.session.findUnique.mockResolvedValue({
        id: "s-1",
        userId: "user-1",
        lastActiveAt: new Date(),
        expiresAt: new Date(Date.now() + 1_000_000),
        revokedAt: null,
      });
      usersService.findById.mockResolvedValue({ id: "user-1", email: DEMO_EMAIL, role: "ADMIN", passwordHash: "x" });

      const result = await service.touchSession("token");

      expect(jwtService.sign).toHaveBeenCalledWith({ sub: "user-1", role: "ADMIN", demo: true });
      expect(result.user).toEqual({ id: "user-1", email: DEMO_EMAIL, role: "ADMIN", isDemo: true });
    });

    it("forgotPassword does nothing for a demo account, so nobody can lock other visitors out", async () => {
      usersService.findByEmail.mockResolvedValue({ id: "user-1", email: DEMO_EMAIL });

      await service.forgotPassword(DEMO_EMAIL);

      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
      expect(mailService.sendMail).not.toHaveBeenCalled();
    });

    it("matches demo emails case-insensitively", async () => {
      usersService.findByEmail.mockResolvedValue({ id: "user-1", email: "Admin@TruckParts.local" });

      await service.forgotPassword("Admin@TruckParts.local");

      expect(mailService.sendMail).not.toHaveBeenCalled();
    });
  });
});
