import { Controller, Post, Patch, Delete, Get, Body, Param, Query, UseGuards } from "@nestjs/common";
import { ReviewsService } from "./reviews.service";
import { CreateReviewDto } from "./dto/create-review.dto";
import { UpdateReviewDto } from "./dto/update-review.dto";
import { AdminListQueryDto } from "../common/dto/admin-list-query.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { UserRole } from "@truckparts/prisma";

@Controller("reviews")
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Post()
  create(@CurrentUser() user: { userId: string }, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(user.userId, dto);
  }

  @Patch(":id")
  update(@CurrentUser() user: { userId: string }, @Param("id") id: string, @Body() dto: UpdateReviewDto) {
    return this.reviewsService.update(user.userId, id, dto);
  }

  @Delete(":id")
  remove(@CurrentUser() user: { userId: string }, @Param("id") id: string) {
    return this.reviewsService.remove(user.userId, id);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get("admin/all")
  findAllAdmin(@Query() query: AdminListQueryDto) {
    return this.reviewsService.findAllAdmin(query);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete("admin/:id")
  removeAdmin(@Param("id") id: string) {
    return this.reviewsService.removeAdmin(id);
  }
}
