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
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";

const BCRYPT_ROUNDS = 12; // higher = slower to brute-force, 12 is a solid modern default
const REFRESH_TOKEN_BYTES = 64;

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
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
    const refreshTokenHash = this.hashRefreshToken(refreshTokenPlain);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash: refreshTokenHash, expiresAt },
    });

    return { accessToken, refreshToken: refreshTokenPlain };
  }

  private hashRefreshToken(token: string) {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  async refresh(refreshTokenPlain: string) {
    const tokenHash = this.hashRefreshToken(refreshTokenPlain);
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
    const tokenHash = this.hashRefreshToken(refreshTokenPlain);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}