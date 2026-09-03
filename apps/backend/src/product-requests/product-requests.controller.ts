import { Controller, Get, Post, Patch, Body, Param, UseGuards } from "@nestjs/common";
import { ProductRequestsService } from "./product-requests.service";
import { CreateProductRequestDto } from "./dto/create-product-request.dto";
import { UpdateProductRequestDto } from "./dto/update-product-request.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { UserRole } from "@truckparts/prisma";

@Controller("product-requests")
@UseGuards(JwtAuthGuard)
export class ProductRequestsController {
  constructor(private productRequestsService: ProductRequestsService) {}

  @Post()
  create(@CurrentUser() user: { userId: string }, @Body() dto: CreateProductRequestDto) {
    return this.productRequestsService.create(user.userId, dto);
  }

  @Get("mine")
  findMine(@CurrentUser() user: { userId: string }) {
    return this.productRequestsService.findMine(user.userId);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get("admin/all")
  findAllAdmin() {
    return this.productRequestsService.findAllAdmin();
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch("admin/:id")
  updateAdmin(@Param("id") id: string, @Body() dto: UpdateProductRequestDto) {
    return this.productRequestsService.updateAdmin(id, dto);
  }
}
