import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { UserRole } from "@truckparts/prisma";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AdminUsersService } from "./admin-users.service";
import { AdminCreateUserDto, AdminSetRoleDto, AdminUsersQueryDto } from "./dto/admin-users.dto";

@Controller("users/admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminUsersController {
  constructor(private adminUsers: AdminUsersService) {}

  @Get("all")
  list(@Query() query: AdminUsersQueryDto) {
    return this.adminUsers.list(query);
  }

  // UTF-8 BOM so Excel shows accents correctly.
  @Get("opt-in.csv")
  async optInCsv(@Res() res: Response) {
    res
      .set({ "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="clients-offres.csv"' })
      .send("﻿" + (await this.adminUsers.optInCsv()));
  }

  @Post()
  create(@Body() dto: AdminCreateUserDto) {
    return this.adminUsers.create(dto);
  }

  @Patch(":id/role")
  setRole(@CurrentUser() actor: { userId: string }, @Param("id") id: string, @Body() dto: AdminSetRoleDto) {
    return this.adminUsers.setRole(actor.userId, id, dto.role);
  }

  @Delete(":id")
  remove(@CurrentUser() actor: { userId: string }, @Param("id") id: string) {
    return this.adminUsers.remove(actor.userId, id);
  }
}
