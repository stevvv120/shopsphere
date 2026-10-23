
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ProductReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllForAdmin() {
    return this.prisma.review.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } },
        product: { select: { id: true, name: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  async removeForAdmin(reviewId: number): Promise<void> {
    this.assertPositiveId(reviewId, 'Review');

    try {
      await this.prisma.review.delete({
        where: { id: reviewId },
      });
    } catch (error) {
      if (this.isPrismaError(error, 'P2025')) {
        throw new NotFoundException('Review not found.');
      }
      throw error;
    }
  }

  async findForProduct(productId: number) {
    this.assertPositiveId(productId, 'Product');

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    const [reviews, aggregate] = await Promise.all([
      this.prisma.review.findMany({
        where: { productId },
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { name: true } },
        },
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

  async createOrUpdate(
    userId: number,
    productId: number,
    dto: CreateReviewDto,
  ) {
    this.assertPositiveId(userId, 'User');
    this.assertPositiveId(productId, 'Product');
    this.validateRating(dto.rating);

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    // Hanya pembeli yang memiliki pesanan berstatus DELIVERED
    // untuk produk ini yang boleh memberikan ulasan.
    const deliveredPurchase = await this.prisma.orderItem.findFirst({
      where: {
        productId,
        order: {
          userId,
          status: OrderStatus.DELIVERED,
        },
      },
      select: { id: true },
    });

    if (!deliveredPurchase) {
      throw new ForbiddenException(
        'You can review this product only after your order has been delivered.',
      );
    }

    const comment = this.normalizeComment(dto.comment);

    try {
      return await this.prisma.review.upsert({
        where: {
          userId_productId: { userId, productId },
        },
        create: {
          userId,
          productId,
          rating: dto.rating,
          comment,
        },
        update: {
          rating: dto.rating,
          comment,
        },
        select: {
          id: true,
          productId: true,
          rating: true,
          comment: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { name: true } },
        },
      });
    } catch (error) {
      if (this.isPrismaError(error, 'P2003')) {
        throw new NotFoundException(
          'User or product was not found.',
        );
      }
      throw error;
    }
  }

  private validateRating(rating: number): void {
    if (
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      throw new BadRequestException(
        'Rating must be an integer between 1 and 5.',
      );
    }
  }

  private assertPositiveId(
    id: number,
    entity: string,
  ): void {
    if (!Number.isSafeInteger(id) || id < 1) {
      throw new BadRequestException(
        `${entity} id must be a positive integer.`,
      );
    }
  }

  private normalizeComment(
    comment: string | null | undefined,
  ): string | null {
    const normalized = comment?.trim() || null;

    if (normalized && normalized.length > 2000) {
      throw new BadRequestException(
        'Review comment cannot exceed 2000 characters.',
      );
    }

    return normalized;
  }

  private isPrismaError(
    error: unknown,
    code: string,
  ): error is Prisma.PrismaClientKnownRequestError {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === code
    );
  }
}
