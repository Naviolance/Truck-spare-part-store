import { Injectable, BadRequestException, NotFoundException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { CouponType, Prisma } from "@truckparts/prisma";
import { CreateCouponDto } from "./dto/create-coupon.dto";
import { UpdateCouponDto } from "./dto/update-coupon.dto";

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCouponDto) {
    const code = dto.code.trim().toUpperCase();
    const existing = await this.prisma.coupon.findUnique({ where: { code } });
    if (existing) throw new ConflictException("A coupon with this code already exists");

    return this.prisma.coupon.create({
      data: {
        code,
        type: dto.type,
        value: dto.value,
        minOrderTotal: dto.minOrderTotal,
        maxUses: dto.maxUses,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });
  }

  findAllAdmin() {
    return this.prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  }

  async update(id: string, dto: UpdateCouponDto) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException("Coupon not found");

    return this.prisma.coupon.update({
      where: { id },
      data: {
        active: dto.active,
        value: dto.value,
        minOrderTotal: dto.minOrderTotal,
        maxUses: dto.maxUses,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });
  }

  async remove(id: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException("Coupon not found");
    return this.prisma.coupon.delete({ where: { id } });
  }

  // Preview for the checkout UI — doesn't consume a use.
  async validate(code: string, subtotal: number) {
    const { coupon, discount } = await this.checkAndComputeDiscount(this.prisma, code, subtotal);
    return { code: coupon.code, discount, type: coupon.type, value: Number(coupon.value) };
  }

  // Used inside the orders checkout transaction — validates AND atomically
  // increments usedCount, so two concurrent checkouts can't both slip past a
  // maxUses limit at the same time.
  async applyWithinTransaction(tx: Prisma.TransactionClient, code: string, subtotal: number) {
    const { coupon, discount } = await this.checkAndComputeDiscount(tx, code, subtotal);

    if (coupon.maxUses !== null) {
      const result = await tx.coupon.updateMany({
        where: { id: coupon.id, usedCount: { lt: coupon.maxUses } },
        data: { usedCount: { increment: 1 } },
      });
      if (result.count === 0) throw new BadRequestException("This coupon has reached its usage limit");
    } else {
      await tx.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
    }

    return { couponId: coupon.id, discount };
  }

  private async checkAndComputeDiscount(
    client: PrismaService | Prisma.TransactionClient,
    rawCode: string,
    subtotal: number,
  ) {
    const code = rawCode.trim().toUpperCase();
    const coupon = await client.coupon.findUnique({ where: { code } });

    if (!coupon || !coupon.active) throw new BadRequestException("Invalid coupon code");
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      throw new BadRequestException("This coupon has expired");
    }
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      throw new BadRequestException("This coupon has reached its usage limit");
    }
    if (coupon.minOrderTotal && subtotal < Number(coupon.minOrderTotal)) {
      throw new BadRequestException(`This coupon requires a minimum order of ${coupon.minOrderTotal}`);
    }

    const rawDiscount =
      coupon.type === CouponType.PERCENTAGE ? (subtotal * Number(coupon.value)) / 100 : Number(coupon.value);
    const discount = Math.min(rawDiscount, subtotal);

    return { coupon, discount };
  }
}
