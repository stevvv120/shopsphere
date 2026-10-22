import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  StockMovementReason,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ShipOrderDto } from './dto/ship-order.dto';
import { getConfiguredShippingFee } from '../store-config';

const orderInclude = {
  items: { orderBy: { id: 'asc' as const } },
};

const adminOrderInclude = {
  ...orderInclude,
  user: { select: { id: true, name: true, email: true } },
};

type OrderRecord = {
  id: number;
  userId: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingCarrier: string | null;
  trackingNumber: string | null;
  shippedAt: Date | null;
  notes: string | null;
  subtotal: Prisma.Decimal;
  shippingFee: Prisma.Decimal;
  total: Prisma.Decimal;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: number;
    productId: number | null;
    productName: string;
    unitPrice: Prisma.Decimal;
    quantity: number;
    lineTotal: Prisma.Decimal;
  }>;
  user?: { id: number; name: string; email: string };
};

const allowedNextStatuses: Record<OrderStatus, OrderStatus[]> = {
  PENDING: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  PROCESSING: [OrderStatus.CANCELLED],
  SHIPPED: [OrderStatus.DELIVERED],
  DELIVERED: [],
  CANCELLED: [],
};

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateOrderDto, idempotencyKey?: string) {
    if (
      idempotencyKey !== undefined
      && (idempotencyKey.length < 8 || idempotencyKey.length > 128
        || !/^[A-Za-z0-9._:-]+$/.test(idempotencyKey))
    ) {
      throw new BadRequestException(
        'Idempotency-Key must be 8-128 characters using letters, numbers, ".", "_", ":", or "-".',
      );
    }
    const requestHash = idempotencyKey
      ? createHash('sha256')
        .update(JSON.stringify({
          paymentMethod: dto.paymentMethod,
          shippingName: dto.shippingName,
          shippingPhone: dto.shippingPhone,
          shippingAddress: dto.shippingAddress,
          notes: dto.notes?.trim() || null,
          items: [...dto.items]
            .map(({ productId, quantity }) => ({ productId, quantity }))
            .sort((left, right) => left.productId - right.productId),
        }))
        .digest('hex')
      : undefined;

    if (idempotencyKey && requestHash) {
      const existing = await this.findIdempotentOrder(userId, idempotencyKey);
      if (existing) return this.resolveIdempotentOrder(existing, requestHash);
    }

    const productIds = dto.items.map((item) => item.productId);
    if (new Set(productIds).size !== productIds.length) {
      throw new BadRequestException('Each product can appear only once in items.');
    }

    try {
      const order = await this.prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      });
      const productById = new Map(products.map((product) => [product.id, product]));
      const itemRows: Array<{
        productId: number;
        productName: string;
        unitPrice: Prisma.Decimal;
        quantity: number;
        lineTotal: Prisma.Decimal;
      }> = [];
      const stockMovements: Array<{
        productId: number;
        productName: string;
        delta: number;
        stockAfter: number;
      }> = [];
      let subtotal = new Prisma.Decimal(0);

      for (const item of dto.items) {
        const product = productById.get(item.productId);
        if (!product) {
          throw new NotFoundException(`Product ${item.productId} was not found.`);
        }

        const stockUpdate = await tx.product.updateMany({
          where: { id: product.id, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (stockUpdate.count !== 1) {
          throw new BadRequestException(
            `Not enough stock for ${product.name}. Refresh the store and update your cart.`,
          );
        }
        const updatedProduct = await tx.product.findUniqueOrThrow({
          where: { id: product.id },
          select: { stock: true },
        });
        stockMovements.push({
          productId: product.id,
          productName: product.name,
          delta: -item.quantity,
          stockAfter: updatedProduct.stock,
        });

        const unitPrice = new Prisma.Decimal(product.price.toString());
        const lineTotal = unitPrice.mul(item.quantity).toDecimalPlaces(2);
        subtotal = subtotal.add(lineTotal);
        itemRows.push({
          productId: product.id,
          productName: product.name,
          unitPrice,
          quantity: item.quantity,
          lineTotal,
        });
      }

      const shippingFee = new Prisma.Decimal(getConfiguredShippingFee());
      const total = subtotal.add(shippingFee);

      const order = await tx.order.create({
        data: {
          userId,
          ...(idempotencyKey && requestHash ? { idempotencyKey, requestHash } : {}),
          paymentMethod: dto.paymentMethod,
          shippingName: dto.shippingName,
          shippingPhone: dto.shippingPhone,
          shippingAddress: dto.shippingAddress,
          notes: dto.notes?.trim() || null,
          subtotal,
          shippingFee,
          total,
          items: { create: itemRows },
        },
        include: orderInclude,
      });
      await tx.user.update({
        where: { id: userId },
        data: {
          shippingName: dto.shippingName,
          shippingPhone: dto.shippingPhone,
          shippingAddress: dto.shippingAddress,
        },
      });
      if (stockMovements.length) {
        await tx.stockMovement.createMany({
          data: stockMovements.map((movement) => ({
            ...movement,
            orderId: order.id,
            reason: StockMovementReason.ORDER_PLACED,
          })),
        });
      }
      return order;
      });

      return this.serializeOrder(order);
    } catch (error) {
      if (
        idempotencyKey
        && requestHash
        && error instanceof Prisma.PrismaClientKnownRequestError
        && error.code === 'P2002'
      ) {
        const existing = await this.findIdempotentOrder(userId, idempotencyKey);
        if (existing) return this.resolveIdempotentOrder(existing, requestHash);
      }
      throw error;
    }
  }

  private findIdempotentOrder(userId: number, idempotencyKey: string) {
    return this.prisma.order.findUnique({
      where: { userId_idempotencyKey: { userId, idempotencyKey } },
      include: orderInclude,
    });
  }

  private resolveIdempotentOrder(
    order: NonNullable<Awaited<ReturnType<OrdersService['findIdempotentOrder']>>>,
    requestHash: string,
  ) {
    if (order.requestHash !== requestHash) {
      throw new ConflictException(
        'This Idempotency-Key was already used with a different checkout request.',
      );
    }
    return this.serializeOrder(order);
  }

  async findMine(userId: number) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: orderInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return orders.map((order) => this.serializeOrder(order));
  }

  async cancelMine(userId: number, id: number) {
    if (!Number.isSafeInteger(id) || id < 1) {
      throw new BadRequestException('id must be a positive integer.');
    }

    const order = await this.prisma.$transaction(async (tx) => {
      const current = await tx.order.findUnique({
        where: { id },
        include: orderInclude,
      });
      if (!current || current.userId !== userId) {
        throw new NotFoundException('Order not found.');
      }
      if (current.status !== OrderStatus.PENDING) {
        throw new BadRequestException('Only a pending order can be cancelled by its customer.');
      }
      if (current.paymentStatus === PaymentStatus.PAID) {
        throw new BadRequestException(
          'A paid order cannot be cancelled here. Contact the store to request a refund.',
        );
      }

      const change = await tx.order.updateMany({
        where: {
          id,
          userId,
          status: OrderStatus.PENDING,
          paymentStatus: current.paymentStatus,
        },
        data: { status: OrderStatus.CANCELLED },
      });
      if (change.count !== 1) {
        throw new ConflictException('Order changed. Refresh and try again.');
      }

      await this.restoreStock(tx, current.items, id);
      await this.writeAuditLog(tx, userId, 'ORDER_CANCELLED', id, {
        status: current.status,
      }, {
        status: OrderStatus.CANCELLED,
      });
      return tx.order.findUniqueOrThrow({ where: { id }, include: orderInclude });
    });

    return this.serializeOrder(order);
  }

  async findAll() {
    const orders = await this.prisma.order.findMany({
      include: adminOrderInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return orders.map((order) => this.serializeOrder(order));
  }

  async updateStatus(id: number, status: OrderStatus, actorUserId: number) {
    if (!Number.isSafeInteger(id) || id < 1) {
      throw new BadRequestException('id must be a positive integer.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: orderInclude,
      });
      if (!order) throw new NotFoundException('Order not found.');
      if (order.status === status) return order;
      if (order.paymentStatus === PaymentStatus.REFUNDED && status !== OrderStatus.CANCELLED) {
        throw new BadRequestException('A refunded order must be cancelled.');
      }
      if (
        (status === OrderStatus.PROCESSING ||
          status === OrderStatus.SHIPPED ||
          status === OrderStatus.DELIVERED) &&
        order.paymentMethod === PaymentMethod.BANK_TRANSFER &&
        order.paymentStatus !== PaymentStatus.PAID
      ) {
        throw new BadRequestException('Confirm the bank transfer before fulfilling this order.');
      }
      if (status === OrderStatus.CANCELLED && order.paymentStatus === PaymentStatus.PAID) {
        throw new BadRequestException('Record the manual refund before cancelling a paid order.');
      }
      if (order.status === OrderStatus.PROCESSING && status === OrderStatus.SHIPPED) {
        throw new BadRequestException('Use the shipping endpoint to add a courier and tracking number.');
      }
      if (!allowedNextStatuses[order.status].includes(status)) {
        throw new BadRequestException(
          `Order cannot move from ${order.status} to ${status}.`,
        );
      }

      const change = await tx.order.updateMany({
        where: { id, status: order.status },
        data: { status },
      });
      if (change.count !== 1) {
        throw new ConflictException('Order status changed. Refresh and try again.');
      }

      if (status === OrderStatus.CANCELLED) {
        await this.restoreStock(tx, order.items, id);
      }
      await this.writeAuditLog(tx, actorUserId, 'ORDER_STATUS_UPDATED', id, {
        status: order.status,
      }, {
        status,
      });

      return tx.order.findUniqueOrThrow({ where: { id }, include: orderInclude });
    });

    return this.serializeOrder(updated);
  }

  async ship(id: number, dto: ShipOrderDto, actorUserId: number) {
    if (!Number.isSafeInteger(id) || id < 1) {
      throw new BadRequestException('id must be a positive integer.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: orderInclude,
      });
      if (!order) throw new NotFoundException('Order not found.');
      if (order.status !== OrderStatus.PROCESSING) {
        throw new BadRequestException('Only an order being processed can be shipped.');
      }
      if (
        order.paymentMethod === PaymentMethod.BANK_TRANSFER &&
        order.paymentStatus !== PaymentStatus.PAID
      ) {
        throw new BadRequestException('Confirm the bank transfer before fulfilling this order.');
      }
      if (order.paymentStatus === PaymentStatus.REFUNDED) {
        throw new BadRequestException('A refunded order cannot be shipped.');
      }

      const change = await tx.order.updateMany({
        where: {
          id,
          status: OrderStatus.PROCESSING,
          paymentStatus: order.paymentStatus,
        },
        data: {
          status: OrderStatus.SHIPPED,
          shippingCarrier: dto.carrier,
          trackingNumber: dto.trackingNumber,
          shippedAt: new Date(),
        },
      });
      if (change.count !== 1) {
        throw new ConflictException('Order changed. Refresh and try again.');
      }

      await this.writeAuditLog(tx, actorUserId, 'ORDER_SHIPPED', id, {
        status: order.status,
        shippingCarrier: order.shippingCarrier,
        trackingNumber: order.trackingNumber,
      }, {
        status: OrderStatus.SHIPPED,
        shippingCarrier: dto.carrier,
        trackingNumber: dto.trackingNumber,
      });
      return tx.order.findUniqueOrThrow({ where: { id }, include: orderInclude });
    });

    return this.serializeOrder(updated);
  }

  async updatePaymentStatus(id: number, status: PaymentStatus, actorUserId: number) {
    if (!Number.isSafeInteger(id) || id < 1) {
      throw new BadRequestException('id must be a positive integer.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: orderInclude,
      });
      if (!order) throw new NotFoundException('Order not found.');
      if (order.paymentStatus === status) return order;

      const allowedNextPaymentStatuses: Record<PaymentStatus, PaymentStatus[]> = {
        PENDING: [PaymentStatus.PAID, PaymentStatus.FAILED],
        PAID: [PaymentStatus.REFUNDED],
        FAILED: [PaymentStatus.PENDING, PaymentStatus.PAID],
        REFUNDED: [],
      };
      if (!allowedNextPaymentStatuses[order.paymentStatus].includes(status)) {
        throw new BadRequestException(
          `Payment cannot move from ${order.paymentStatus} to ${status}.`,
        );
      }
      if (status === PaymentStatus.FAILED && order.paymentMethod !== PaymentMethod.BANK_TRANSFER) {
        throw new BadRequestException('Cash on delivery cannot have a failed transfer status.');
      }
      if (status === PaymentStatus.PAID && order.status === OrderStatus.CANCELLED) {
        throw new BadRequestException('A cancelled order cannot be marked as paid.');
      }
      if (
        status === PaymentStatus.REFUNDED &&
        order.status !== OrderStatus.PENDING &&
        order.status !== OrderStatus.PROCESSING
      ) {
        throw new BadRequestException('Only an unshipped order can be marked as refunded.');
      }

      const change = await tx.order.updateMany({
        where: { id, status: order.status, paymentStatus: order.paymentStatus },
        data: { paymentStatus: status },
      });
      if (change.count !== 1) {
        throw new ConflictException('Order payment changed. Refresh and try again.');
      }

      await this.writeAuditLog(tx, actorUserId, 'ORDER_PAYMENT_UPDATED', id, {
        paymentStatus: order.paymentStatus,
      }, {
        paymentStatus: status,
      });
      return tx.order.findUniqueOrThrow({ where: { id }, include: orderInclude });
    });

    return this.serializeOrder(updated);
  }

  async findAuditLogs() {
    return this.prisma.auditLog.findMany({
      where: { entityType: 'ORDER' },
      select: {
        id: true,
        actorUserId: true,
        action: true,
        entityType: true,
        entityId: true,
        before: true,
        after: true,
        createdAt: true,
        actor: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
    });
  }

  private writeAuditLog(
    tx: Prisma.TransactionClient,
    actorUserId: number,
    action: string,
    orderId: number,
    before: Prisma.InputJsonValue,
    after: Prisma.InputJsonValue,
  ) {
    return tx.auditLog.create({
      data: {
        actorUserId,
        action,
        entityType: 'ORDER',
        entityId: orderId,
        before,
        after,
      },
    });
  }

  private serializeOrder(order: OrderRecord) {
    return {
      ...order,
      subtotal: order.subtotal.toString(),
      shippingFee: order.shippingFee.toString(),
      total: order.total.toString(),
      items: order.items.map((item) => ({
        ...item,
        unitPrice: item.unitPrice.toString(),
        lineTotal: item.lineTotal.toString(),
      })),
    };
  }

  private async restoreStock(
    tx: Prisma.TransactionClient,
    items: OrderRecord['items'],
    orderId: number,
  ): Promise<void> {
    for (const item of items) {
      if (item.productId !== null) {
        const restored = await tx.product.updateMany({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
        if (restored.count === 1) {
          const product = await tx.product.findUniqueOrThrow({
            where: { id: item.productId },
            select: { name: true, stock: true },
          });
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              productName: product.name,
              orderId,
              delta: item.quantity,
              stockAfter: product.stock,
              reason: StockMovementReason.ORDER_CANCELLED,
            },
          });
        }
      }
    }
  }
}
