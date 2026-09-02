import { UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";

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
    refreshToken: {
      updateMany: jest.fn(),
    },
    $transaction: jest.fn((ops: any[]) => Promise.all(ops)),
  };
}

describe("AuthService password reset", () => {
  let prisma: ReturnType<typeof mockPrisma>;
  let usersService: { findByEmail: jest.Mock };
  let mailService: { sendMail: jest.Mock };
  let service: AuthService;

  beforeEach(() => {
    prisma = mockPrisma();
    usersService = { findByEmail: jest.fn() };
    mailService = { sendMail: jest.fn().mockResolvedValue(undefined) };
    // jwtService isn't touched by forgotPassword/resetPassword.
    service = new AuthService(usersService as any, {} as any, prisma as any, mailService as any);
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
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: "user-1", revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });
});
