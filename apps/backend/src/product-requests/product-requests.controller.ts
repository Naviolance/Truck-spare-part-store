import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ProductRequestsService } from "./product-requests.service";
import { CreateProductRequestDto } from "./dto/create-product-request.dto";
import { UpdateProductRequestDto } from "./dto/update-product-request.dto";
import { AdminRequestsQueryDto } from "./dto/admin-requests-query.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OptionalJwtAuthGuard } from "../auth/guards/optional-jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { UserRole } from "@truckparts/prisma";

@Controller("product-requests")
export class ProductRequestsController {
  constructor(private productRequestsService: ProductRequestsService) {}

  // Open to guests: "can't find it? tell us" must not require an account.
  // Linked to the account when the caller is logged in. 5 per 10 minutes
  // per visitor (plus the honeypot in the DTO) keeps spam out without a CAPTCHA.
  @UseGuards(OptionalJwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 10 * 60_000 } })
  @Post()
  create(@CurrentUser() user: { userId: string } | null, @Body() dto: CreateProductRequestDto) {
    return this.productRequestsService.create(user?.userId ?? null, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get("mine")
  findMine(@CurrentUser() user: { userId: string }) {
    return this.productRequestsService.findMine(user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get("admin/all")
  findAllAdmin(@Query() query: AdminRequestsQueryDto) {
    return this.productRequestsService.findAllAdmin(query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch("admin/:id")
  updateAdmin(@Param("id") id: string, @Body() dto: UpdateProductRequestDto) {
    return this.productRequestsService.updateAdmin(id, dto);
  }
}
