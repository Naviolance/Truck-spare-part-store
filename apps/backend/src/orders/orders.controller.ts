import { Controller, Get, Post, Patch, Body, Param, UseGuards } from "@nestjs/common";
import { OrdersService } from "./orders.service";
import { OrderPaymentsService } from "./order-payments.service";
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
  constructor(
    private ordersService: OrdersService,
    private orderPayments: OrderPaymentsService,
  ) {}

  // Which payment methods checkout should offer (online only when a
  // provider is configured). Declared before ":id" so it isn't swallowed by it.
  @Get("payment-options")
  paymentOptions() {
    return this.orderPayments.options();
  }

  @Post()
  checkout(@CurrentUser() user: { userId: string }, @Body() dto: CreateOrderDto) {
    return this.ordersService.checkout(user.userId, dto);
  }

  // Start or RETRY an online payment for a still-unpaid order.
  @Post(":id/pay")
  initiatePayment(@CurrentUser() user: { userId: string }, @Param("id") id: string) {
    return this.orderPayments.startOnlinePayment(user.userId, id);
  }

  @Post(":id/pay-cash")
  selectCashPayment(@CurrentUser() user: { userId: string }, @Param("id") id: string) {
    return this.ordersService.selectCashPayment(user.userId, id);
  }

  @Post(":id/confirm-cash")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  confirmCashPayment(@Param("id") id: string) {
    return this.ordersService.confirmCashPayment(id);
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

  // Checks access first, then asks the provider about a still-pending online
  // payment (webhooks can be late), then returns the up-to-date order.
  @Get(":id")
  async findOne(@CurrentUser() user: { userId: string; role: string }, @Param("id") id: string) {
    const isAdmin = user.role === "ADMIN";
    await this.ordersService.findOne(user.userId, id, isAdmin);
    await this.orderPayments.reconcilePending(id);
    return this.ordersService.findOne(user.userId, id, isAdmin);
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