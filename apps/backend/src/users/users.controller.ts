import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController {
  constructor(private usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get("me")
  async me(@CurrentUser() user: { userId: string; role: string }) {
    const fullUser = await this.usersService.findById(user.userId);
    if (!fullUser) return null;

    const { passwordHash, ...safeUser } = fullUser;
    return safeUser;
  }
}