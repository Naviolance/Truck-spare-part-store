import { Controller, Post, Body, Res, Req, UnauthorizedException, HttpCode } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Response, Request } from "express";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";

const REFRESH_COOKIE_NAME = "refresh_token";
const REFRESH_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post("register")
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken } = await this.authService.register(dto);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post("login")
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken } = await this.authService.login(dto);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @HttpCode(200)
  @Post("refresh")
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!token) throw new UnauthorizedException("No refresh token provided");

    const { accessToken, refreshToken } = await this.authService.refresh(token);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @HttpCode(200)
  @Post("logout")
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    if (token) await this.authService.logout(token);
    res.clearCookie(REFRESH_COOKIE_NAME);
    return { success: true };
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post("forgot-password")
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return { message: "If that email exists, a reset link has been sent" };
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post("reset-password")
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { message: "Password updated successfully" };
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie(REFRESH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: REFRESH_COOKIE_MAX_AGE_MS,
      path: "/auth",
    });
  }
}