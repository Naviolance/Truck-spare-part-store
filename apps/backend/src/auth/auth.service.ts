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

const BCRYPT_ROUNDS = 12; // higher = slower to brute-force, 12 is a solid modern default
const REFRESH_TOKEN_BYTES = 64;
const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

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

    return this.issueTokens(user.id, user.role);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    const genericError = () => new UnauthorizedException("Invalid email or password");

    if (!user) throw genericError();

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) throw genericError();

    return this.issueTokens(user.id, user.role);
  }

  private async issueTokens(userId: string, role: string) {
    const accessToken = this.jwtService.sign({ sub: userId, role });

    const refreshTokenPlain = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString("hex");
    const refreshTokenHash = this.hashToken(refreshTokenPlain);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash: refreshTokenHash, expiresAt },
    });

    return { accessToken, refreshToken: refreshTokenPlain };
  }

  private hashToken(token: string) {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  async refresh(refreshTokenPlain: string) {
    const tokenHash = this.hashToken(refreshTokenPlain);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException("Session expired, please log in again");
    }

    if (stored.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException("Session invalid, please log in again");
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const user = await this.usersService.findById(stored.userId);
    if (!user) throw new UnauthorizedException("Account no longer exists");

    return this.issueTokens(user.id, user.role);
  }

  async logout(refreshTokenPlain: string) {
    const tokenHash = this.hashToken(refreshTokenPlain);
    await this.prisma.refreshToken.updateMany({
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
      this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }
}