import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from "@nestjs/common";
import { CartService } from "./cart.service";
import { AddItemDto } from "./dto/add-item.dto";
import { UpdateItemDto } from "./dto/update-item.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";

@Controller("cart")
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private cartService: CartService) {}

  @Get()
  getCart(@CurrentUser() user: { userId: string }) {
    return this.cartService.getCart(user.userId);
  }

  @Post("items")
  addItem(@CurrentUser() user: { userId: string }, @Body() dto: AddItemDto) {
    return this.cartService.addItem(user.userId, dto.productId, dto.quantity);
  }

  @Patch("items/:id")
  updateItem(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
    @Body() dto: UpdateItemDto,
  ) {
    return this.cartService.updateItem(user.userId, id, dto.quantity);
  }

  @Delete("items/:id")
  removeItem(@CurrentUser() user: { userId: string }, @Param("id") id: string) {
    return this.cartService.removeItem(user.userId, id);
  }
}