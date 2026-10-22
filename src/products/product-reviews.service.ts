import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ProductReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  findAllForAdmin() {
    return this.prisma.review.findMany({
      include: {
        user: { select: { name: true, email: true } },
        product: { select: { id: true, name: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  async removeForAdmin(reviewId: number): Promise<void> {
    this.assertPositiveId(reviewId);
    try {
      await this.prisma.review.delete({ where: { id: reviewId } });
    } catch (error) {
      if ((error as { code?: string } | null)?.code === 'P2025') {
        throw new NotFoundException('Review not found.');
      }
      throw error;
    }
  }

  async findForProduct(productId: number) {
    this.assertPositiveId(productId);
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Product not found.');

    const [reviews, aggregate] = await Promise.all([
      this.prisma.review.findMany({
        where: { productId },
        include: { user: { select: { name: true } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
      this.prisma.review.aggregate({
        where: { productId },
        _avg: { rating: true },
        _count: { _all: true },
      }),
    ]);

    return {
      productId,
      averageRating: aggregate._avg.rating,
      reviewCount: aggregate._count._all,
      reviews,
    };
  }

  async createOrUpdate(userId: number, productId: number, dto: CreateReviewDto) {
    this.assertPositiveId(productId);
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Product not found.');

    const deliveredPurchase = await this.prisma.orderItem.findFirst({
      where: {
        productId,
        order: { userId, status: OrderStatus.DELIVERED },
      },
      select: { id: true },
    });
    if (!deliveredPurchase) {
      throw new ForbiddenException('You can review a product after its order is delivered.');
    }

    try {
      return await this.prisma.review.upsert({
        where: { userId_productId: { userId, productId } },
        create: {
          userId,
          productId,
          rating: dto.rating,
          comment: this.normalizeComment(dto.comment),
        },
        update: {
          rating: dto.rating,
          comment: this.normalizeComment(dto.comment),
        },
        include: { user: { select: { name: true } } },
      });
    } catch (error) {
      if ((error as { code?: string } | null)?.code === 'P2003') {
        throw new NotFoundException('Product not found.');
      }
      throw error;
    }
  }

  private assertPositiveId(id: number) {
    if (!Number.isSafeInteger(id) || id < 1) {
      throw new BadRequestException('Product id must be a positive integer.');
    }
  }

  private normalizeComment(comment: string | null | undefined): string | null {
    return comment?.trim() || null;
  }
}
