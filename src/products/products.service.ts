import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StockMovementReason } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

const productInclude = { category: true } as const;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const products = await this.prisma.product.findMany({
      include: { ...productInclude, _count: { select: { reviews: true } } },
      orderBy: { id: 'asc' },
    });
    const ratings = products.length
      ? await this.prisma.review.groupBy({
          by: ['productId'],
          where: { productId: { in: products.map((product) => product.id) } },
          _avg: { rating: true },
        })
      : [];
    const averageByProduct = new Map(
      ratings.map((rating) => [rating.productId, rating._avg.rating]),
    );

    return products.map(({ _count, ...product }) => ({
      ...this.serialize(product),
      averageRating: averageByProduct.get(product.id) ?? null,
      reviewCount: _count.reviews,
    }));
  }

  async findOne(id: number) {
    this.assertPositiveId(id);
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: productInclude,
    });
    if (!product) throw new NotFoundException('Product not found.');
    return this.serialize(product);
  }

  async create(dto: CreateProductDto) {
    this.assertPrice(dto.price);
    try {
      const product = await this.prisma.$transaction(async (tx) => {
        const created = await tx.product.create({
          data: {
            name: dto.name.trim(),
            price: dto.price,
            ...(dto.imageUrl !== undefined && {
              imageUrl: this.normalizeImageUrl(dto.imageUrl),
            }),
            ...(dto.description !== undefined && {
              description: this.normalizeDescription(dto.description),
            }),
            ...(dto.stock !== undefined && { stock: dto.stock }),
            ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
          },
          include: productInclude,
        });
        if (created.stock > 0) {
          await tx.stockMovement.create({
            data: {
              productId: created.id,
              productName: created.name,
              delta: created.stock,
              stockAfter: created.stock,
              reason: StockMovementReason.INITIAL_STOCK,
            },
          });
        }
        return created;
      });
      return this.serialize(product);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async update(id: number, dto: UpdateProductDto) {
    this.assertPositiveId(id);
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('Provide at least one product field to update.');
    }
    if (dto.price !== undefined) this.assertPrice(dto.price);

    const data: {
      name?: string;
      price?: string;
      imageUrl?: string | null;
      description?: string | null;
      stock?: number;
      categoryId?: number | null;
    } = {};

    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.price !== undefined) data.price = dto.price;
    if (dto.imageUrl !== undefined) data.imageUrl = this.normalizeImageUrl(dto.imageUrl);
    if (dto.description !== undefined) {
      data.description = this.normalizeDescription(dto.description);
    }
    if (dto.stock !== undefined) data.stock = dto.stock;
    if (dto.categoryId !== undefined) data.categoryId = dto.categoryId;

    try {
      const product = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.product.findUnique({
          where: { id },
          select: { stock: true },
        });
        if (!existing) throw new NotFoundException('Product not found.');

        const updated = await tx.product.update({
          where: { id },
          data,
          include: productInclude,
        });
        if (dto.stock !== undefined && dto.stock !== existing.stock) {
          await tx.stockMovement.create({
            data: {
              productId: id,
              productName: updated.name,
              delta: dto.stock - existing.stock,
              stockAfter: dto.stock,
              reason: StockMovementReason.MANUAL_ADJUSTMENT,
            },
          });
        }
        return updated;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      return this.serialize(product);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async restock(id: number, quantity: number) {
    this.assertPositiveId(id);
    const maximumStock = 2_147_483_647;
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.product.updateMany({
        where: { id, stock: { lte: maximumStock - quantity } },
        data: { stock: { increment: quantity } },
      });
      if (result.count === 0) {
        const existing = await tx.product.findUnique({
          where: { id },
          select: { id: true },
        });
        if (!existing) throw new NotFoundException('Product not found.');
        throw new BadRequestException('Restock quantity exceeds the stock limit.');
      }

      const product = await tx.product.findUniqueOrThrow({
        where: { id },
        include: productInclude,
      });
      await tx.stockMovement.create({
        data: {
          productId: id,
          productName: product.name,
          delta: quantity,
          stockAfter: product.stock,
          reason: StockMovementReason.RESTOCK,
        },
      });
      return this.serialize(product);
    });
  }

  async stockMovements(id: number) {
    this.assertPositiveId(id);
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Product not found.');
    return this.prisma.stockMovement.findMany({
      where: { productId: id },
      select: {
        id: true,
        productName: true,
        orderId: true,
        delta: true,
        stockAfter: true,
        reason: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
    });
  }

  async remove(id: number): Promise<void> {
    this.assertPositiveId(id);
    try {
      await this.prisma.product.delete({ where: { id } });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  private serialize<T extends { price: { toString(): string } }>(product: T) {
    return { ...product, price: product.price.toString() };
  }

  private normalizeDescription(value: string | null): string | null {
    if (value === null) return null;
    return value.trim() || null;
  }

  private normalizeImageUrl(value: string | null): string | null {
    return value?.trim() || null;
  }

  private assertPositiveId(id: number): void {
    if (!Number.isSafeInteger(id) || id < 1) {
      throw new BadRequestException('id must be a positive integer.');
    }
  }

  private assertPrice(value: string): void {
    if (Number(value) > 99_999_999.99) {
      throw new BadRequestException(
        'price must be between 0 and 99999999.99, with up to 2 decimal places.',
      );
    }
  }

  private handlePrismaError(error: unknown): never {
    const code = (error as { code?: string } | null)?.code;
    if (code === 'P2034') {
      throw new ConflictException('Product stock changed. Refresh and try again.');
    }
    if (code === 'P2025') throw new NotFoundException('Product not found.');
    if (code === 'P2003') {
      throw new BadRequestException('The selected category does not exist.');
    }
    throw error;
  }
}
