import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from "@nestjs/common";
import { CouponsService } from "./coupons.service";
import { CreateCouponDto } from "./dto/create-coupon.dto";
import { UpdateCouponDto } from "./dto/update-coupon.dto";
import { ValidateCouponDto } from "./dto/validate-coupon.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "@truckparts/prisma";

@Controller("coupons")
@UseGuards(JwtAuthGuard)
export class CouponsController {
  constructor(private couponsService: CouponsService) {}

  @Post("validate")
  validate(@Body() dto: ValidateCouponDto) {
    return this.couponsService.validate(dto.code, dto.subtotal);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get("admin/all")
  findAllAdmin() {
    return this.couponsService.findAllAdmin();
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateCouponDto) {
    return this.couponsService.create(dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateCouponDto) {
    return this.couponsService.update(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.couponsService.remove(id);
  }
}
