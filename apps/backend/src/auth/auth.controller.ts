import { Controller, Post, Body, Res, Req, UnauthorizedException, ForbiddenException, HttpCode } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Response, Request } from "express";
import * as crypto from "crypto";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";

const REFRESH_COOKIE_NAME = "refresh_token";
const REFRESH_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

// /auth/refresh and /auth/logout are the only two routes that trust the
// httpOnly cookie alone with no Bearer token to back it up — every other
// authenticated route requires the Authorization header, which a
// cross-site attacker can't forge (it lives in JS memory, never a cookie).
// sameSite=lax on the refresh cookie already blocks the classic cross-site
// POST attack in modern browsers, but this double-submit token is a second,
// independent layer: it only validates if the caller's JS could read a
// cookie value set on OUR origin, which a different origin's page cannot.
const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";

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
    this.verifyCsrf(req);

    const { accessToken, refreshToken } = await this.authService.refresh(token);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @HttpCode(200)
  @Post("logout")
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.[REFRESH_COOKIE_NAME];
    if (token) {
      this.verifyCsrf(req);
      await this.authService.logout(token);
    }
    // clearCookie must be called with the SAME path the cookie was set
    // with, or the browser treats it as a different cookie entirely and
    // the real one is left behind.
    res.clearCookie(REFRESH_COOKIE_NAME, { path: "/auth" });
    res.clearCookie(CSRF_COOKIE_NAME, { path: "/" });
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

    // Deliberately NOT httpOnly — the frontend JS needs to read this value
    // itself and echo it back as a header. That's the whole mechanism: a
    // cross-site attacker can trigger a request with our cookies attached,
    // but their JS can never read a cookie that belongs to our origin, so
    // they can't produce a header that matches.
    //
    // path MUST be "/" here, unlike the refresh cookie — document.cookie
    // visibility is checked against the CURRENT PAGE's path, and the
    // frontend has no pages under /auth/*, so path: "/auth" would make this
    // cookie permanently invisible to the frontend and break every refresh.
    res.cookie(CSRF_COOKIE_NAME, crypto.randomBytes(24).toString("hex"), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: REFRESH_COOKIE_MAX_AGE_MS,
      path: "/",
    });
  }

  private verifyCsrf(req: Request) {
    const cookieValue = req.cookies?.[CSRF_COOKIE_NAME];
    const headerValue = req.headers[CSRF_HEADER_NAME];
    if (!cookieValue || !headerValue || cookieValue !== headerValue) {
      throw new ForbiddenException("Missing or invalid CSRF token");
    }
  }
}