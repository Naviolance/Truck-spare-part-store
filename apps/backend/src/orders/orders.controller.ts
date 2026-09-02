import { Controller, Get, Post, Patch, Body, Param, UseGuards } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { UpdateOrderStatusDto } from "./dto/update-order-status.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { UserRole } from "@truckparts/prisma";

@Controller("orders")
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  checkout(@CurrentUser() user: { userId: string }, @Body() dto: CreateOrderDto) {
    return this.ordersService.checkout(user.userId, dto);
  }

  @Post(":id/pay")
  initiatePayment(@CurrentUser() user: { userId: string }, @Param("id") id: string) {
    return this.ordersService.initiatePayment(user.userId, id);
  }

  @Get()
  findMyOrders(@CurrentUser() user: { userId: string }) {
    return this.ordersService.findMyOrders(user.userId);
  }

  @Get("admin/all")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  findAllAdmin() {
    return this.ordersService.findAllAdmin();
  }

  @Get(":id")
  findOne(@CurrentUser() user: { userId: string; role: string }, @Param("id") id: string) {
    return this.ordersService.findOne(user.userId, id, user.role === "ADMIN");
  }

  @Patch(":id/status")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  updateStatus(@Param("id") id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto.status);
  }

  @Post(":id/cancel")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  cancelOrder(@Param("id") id: string) {
    return this.ordersService.cancelOrder(id);
  }
}