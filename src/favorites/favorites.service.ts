import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SyncFavoritesDto } from './dto/sync-favorites.dto';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async findMine(userId: number) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      select: { productId: true },
      orderBy: { createdAt: 'asc' },
    });
    return { productIds: favorites.map((favorite) => favorite.productId) };
  }

  async add(userId: number, productId: number) {
    this.assertPositiveId(productId);
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Product not found.');

    await this.prisma.favorite.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId },
      update: {},
    });
    return { productId, isFavorite: true };
  }

  async remove(userId: number, productId: number): Promise<void> {
    this.assertPositiveId(productId);
    await this.prisma.favorite.deleteMany({ where: { userId, productId } });
  }

  async sync(userId: number, dto: SyncFavoritesDto) {
    const productIds = [...new Set(dto.productIds)];
    if (productIds.length > 0) {
      const products = await this.prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true },
      });
      if (products.length !== productIds.length) {
        throw new NotFoundException('One or more favorite products were not found.');
      }

      await this.prisma.favorite.createMany({
        data: productIds.map((productId) => ({ userId, productId })),
        skipDuplicates: true,
      });
    }
    return this.findMine(userId);
  }

  private assertPositiveId(id: number): void {
    if (!Number.isSafeInteger(id) || id < 1) {
      throw new BadRequestException('Product id must be a positive integer.');
    }
  }
}
