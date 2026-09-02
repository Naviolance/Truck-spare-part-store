import { Injectable, NotFoundException, ForbiddenException, ConflictException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { CreateReviewDto } from "./dto/create-review.dto";
import { UpdateReviewDto } from "./dto/update-review.dto";

const EDIT_WINDOW_MS = 10 * 60 * 1000; // customers can edit/delete their own review for 10 minutes after posting

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateReviewDto) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException("Product not found");

    const existing = await this.prisma.review.findUnique({
      where: { productId_userId: { productId: dto.productId, userId } },
    });
    if (existing) {
      throw new ConflictException("You've already reviewed this product — edit your existing review instead.");
    }

    return this.prisma.review.create({
      data: { productId: dto.productId, userId, rating: dto.rating, comment: dto.comment },
    });
  }

  async update(userId: string, reviewId: string, dto: UpdateReviewDto) {
    const review = await this.findOwnedWithinWindow(userId, reviewId);
    return this.prisma.review.update({
      where: { id: review.id },
      data: { rating: dto.rating, comment: dto.comment },
    });
  }

  async remove(userId: string, reviewId: string) {
    const review = await this.findOwnedWithinWindow(userId, reviewId);
    return this.prisma.review.delete({ where: { id: review.id } });
  }

  private async findOwnedWithinWindow(userId: string, reviewId: string) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException("Review not found");
    if (review.userId !== userId) throw new ForbiddenException("This isn't your review");

    const ageMs = Date.now() - review.createdAt.getTime();
    if (ageMs > EDIT_WINDOW_MS) {
      throw new ForbiddenException("Reviews can only be edited or deleted within 10 minutes of posting");
    }

    return review;
  }

  findAllAdmin() {
    return this.prisma.review.findMany({
      include: {
        product: { select: { id: true, name: true, slug: true } },
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async removeAdmin(reviewId: string) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException("Review not found");
    return this.prisma.review.delete({ where: { id: reviewId } });
  }
}
