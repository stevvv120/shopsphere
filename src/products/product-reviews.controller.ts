import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { AuthenticatedUser } from '../auth/auth-user.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateReviewDto } from './dto/create-review.dto';
import { ProductReviewsService } from './product-reviews.service';

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@Controller('products/:productId/reviews')
export class ProductReviewsController {
  constructor(private readonly reviewsService: ProductReviewsService) {}

  @Get()
  findForProduct(@Param('productId', ParseIntPipe) productId: number) {
    return this.reviewsService.findForProduct(productId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  createOrUpdate(
    @Param('productId', ParseIntPipe) productId: number,
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.createOrUpdate(request.user.id, productId, dto);
  }
}
