import { Controller, Get, Patch, Body, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { UsersService } from "./users.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";
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
  @UseGuards(JwtAuthGuard)
  @Patch("me")
  async updateMe(@CurrentUser() user: { userId: string }, @Body() dto: UpdateProfileDto) {
    const updated = await this.usersService.updateProfile(user.userId, dto);
    const { passwordHash, ...safeUser } = updated;
    return safeUser;
  }
}