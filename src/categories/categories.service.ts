import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

const categoryInclude = { _count: { select: { products: true } } } as const;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.category.findMany({
      include: categoryInclude,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    this.assertPositiveId(id);
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: categoryInclude,
    });
    if (!category) throw new NotFoundException('Category not found.');
    return category;
  }

  async create(dto: CreateCategoryDto) {
    const slug = dto.slug ?? this.slugFromName(dto.name);
    this.assertValidSlug(slug);

    try {
      return await this.prisma.category.create({
        data: { name: dto.name.trim(), slug },
        include: categoryInclude,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async update(id: number, dto: UpdateCategoryDto) {
    this.assertPositiveId(id);
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('Provide name and/or slug to update.');
    }

    const data: { name?: string; slug?: string } = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.slug !== undefined) {
      this.assertValidSlug(dto.slug);
      data.slug = dto.slug;
    }

    try {
      return await this.prisma.category.update({
        where: { id },
        data,
        include: categoryInclude,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async remove(id: number): Promise<void> {
    this.assertPositiveId(id);
    try {
      await this.prisma.category.delete({ where: { id } });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  private slugFromName(name: string): string {
    return name
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private assertValidSlug(slug: string): void {
    if (slug.length > 120 || !slugPattern.test(slug)) {
      throw new BadRequestException(
        'slug must use lowercase letters, numbers, and single hyphens.',
      );
    }
  }

  private assertPositiveId(id: number): void {
    if (!Number.isSafeInteger(id) || id < 1) {
      throw new BadRequestException('id must be a positive integer.');
    }
  }

  private handlePrismaError(error: unknown): never {
    const code = (error as { code?: string } | null)?.code;
    if (code === 'P2025') throw new NotFoundException('Category not found.');
    if (code === 'P2002') {
      throw new ConflictException(
        'A category with that name or slug already exists.',
      );
    }
    throw error;
  }
}
