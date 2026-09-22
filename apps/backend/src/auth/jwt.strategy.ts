import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_SECRET")!,
    });
  }

  // `demo` is only present on demo accounts' tokens (see AuthService's
  // signAccessToken); DemoReadOnlyInterceptor reads isDemo off request.user.
  async validate(payload: { sub: string; role: string; demo?: boolean }) {
    return { userId: payload.sub, role: payload.role, isDemo: payload.demo === true };
  }
}