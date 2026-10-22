import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProductsController } from './products.controller';
import { ProductReviewsController } from './product-reviews.controller';
import { AdminProductReviewsController } from './admin-product-reviews.controller';
import { ProductReviewsService } from './product-reviews.service';
import { ProductsService } from './products.service';

@Module({
  imports: [AuthModule],
  controllers: [ProductsController, ProductReviewsController, AdminProductReviewsController],
  providers: [ProductsService, ProductReviewsService],
})
export class ProductsModule {}
