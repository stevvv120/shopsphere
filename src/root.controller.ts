import { Controller, Get } from '@nestjs/common';
import { getBankTransferInstructions, getConfiguredShippingFee } from './store-config';

@Controller()
export class RootController {
  @Get()
  getApiInfo() {
    return {
      name: 'ShopSphere API',
      status: 'running',
      endpoints: {
        health: '/api/v1/health',
        auth: {
          register: 'POST /api/v1/auth/register',
          login: 'POST /api/v1/auth/login',
        },
        products: '/api/v1/products',
        storeConfig: '/api/v1/store-config',
        productReviews: {
          list: 'GET /api/v1/products/:id/reviews',
          createOrUpdate: 'POST /api/v1/products/:id/reviews (CUSTOMER, delivered order required)',
          adminList: 'GET /api/v1/admin/reviews (ADMIN)',
          adminDelete: 'DELETE /api/v1/admin/reviews/:id (ADMIN)',
        },
        categories: '/api/v1/categories',
        orders: {
          create: 'POST /api/v1/orders (CUSTOMER)',
          mine: 'GET /api/v1/orders/mine (CUSTOMER)',
          cancelMine: 'POST /api/v1/orders/:id/cancel (CUSTOMER, pending unpaid orders only)',
          admin: 'GET /api/v1/orders (ADMIN)',
          paymentStatus: 'PATCH /api/v1/orders/:id/payment-status (ADMIN)',
          shipping: 'PATCH /api/v1/orders/:id/shipping (ADMIN)',
        },
        favorites: {
          mine: 'GET /api/v1/favorites (CUSTOMER)',
          sync: 'POST /api/v1/favorites/sync (CUSTOMER)',
          add: 'POST /api/v1/favorites/:productId (CUSTOMER)',
          remove: 'DELETE /api/v1/favorites/:productId (CUSTOMER)',
        },
      },
    };
  }

  @Get('store-config')
  getStoreConfig() {
    return {
      shippingFee: getConfiguredShippingFee(),
      bankTransfer: getBankTransferInstructions(),
    };
  }
}
