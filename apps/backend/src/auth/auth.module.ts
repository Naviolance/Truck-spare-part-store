import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./jwt.strategy";
import { UsersModule } from "../users/users.module";
import { MailModule } from "../mail/mail.module";

@Module({
  imports: [
    UsersModule,
    PassportModule,
    MailModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>("JWT_SECRET"),
        // Deliberately shorter than the refresh token's 15-minute sliding
        // window (see auth.service.ts) — this is what forces a refresh
        // attempt (and therefore a real activity check) at least every 5
        // minutes during active use, while leaving comfortable buffer
        // before the refresh token itself could expire.
        signOptions: { expiresIn: config.get<string>("JWT_ACCESS_EXPIRES_IN") ?? "5m" },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}