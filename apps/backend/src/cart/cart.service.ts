import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { ProductStatus } from "@truckparts/prisma";

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  private async getOrCreateCart(userId: string) {
    let cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      cart = await this.prisma.cart.create({ data: { userId } });
    }
    return cart;
  }

  async getCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    const items = await this.prisma.cartItem.findMany({
      where: { cartId: cart.id },
      include: { product: { include: { images: { orderBy: { position: "asc" }, take: 1 } } } },
      orderBy: { id: "asc" },
    });

    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.product.price) * item.quantity,
      0,
    );

    return { items, subtotal };
  }

  async addItem(userId: string, productId: string, quantity: number) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.status !== ProductStatus.PUBLISHED) {
      throw new NotFoundException("Product not available");
    }
    if (product.quantity < quantity) {
      throw new BadRequestException("Not enough stock available");
    }

    const cart = await this.getOrCreateCart(userId);

    const existing = await this.prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } },
    });

    if (existing) {
      const newQuantity = existing.quantity + quantity;
      if (product.quantity < newQuantity) {
        throw new BadRequestException("Not enough stock available");
      }
      return this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: newQuantity },
      });
    }

    return this.prisma.cartItem.create({
      data: { cartId: cart.id, productId, quantity },
    });
  }

  async updateItem(userId: string, itemId: string, quantity: number) {
    const cart = await this.getOrCreateCart(userId);
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
      include: { product: true },
    });
    if (!item) throw new NotFoundException("Cart item not found");
    if (item.product.quantity < quantity) {
      throw new BadRequestException("Not enough stock available");
    }

    return this.prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
  }

  async removeItem(userId: string, itemId: string) {
    const cart = await this.getOrCreateCart(userId);
    const item = await this.prisma.cartItem.findFirst({ where: { id: itemId, cartId: cart.id } });
    if (!item) throw new NotFoundException("Cart item not found");

    return this.prisma.cartItem.delete({ where: { id: itemId } });
  }
}