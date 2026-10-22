import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Patch,
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
import { CreateOrderDto } from './dto/create-order.dto';
import { ShipOrderDto } from './dto/ship-order.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersService } from './orders.service';

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles(Role.CUSTOMER)
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateOrderDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.ordersService.create(request.user.id, dto, idempotencyKey);
  }

  @Get('mine')
  @Roles(Role.CUSTOMER)
  findMine(@Req() request: AuthenticatedRequest) {
    return this.ordersService.findMine(request.user.id);
  }

  @Post(':id/cancel')
  @Roles(Role.CUSTOMER)
  cancelMine(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ordersService.cancelMine(request.user.id, id);
  }

  @Get('audit-log')
  @Roles(Role.ADMIN)
  findAuditLogs() {
    return this.ordersService.findAuditLogs();
  }

  @Get()
  @Roles(Role.ADMIN)
  findAll() {
    return this.ordersService.findAll();
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN)
  updateStatus(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, dto.status, request.user.id);
  }

  @Patch(':id/shipping')
  @Roles(Role.ADMIN)
  ship(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ShipOrderDto,
  ) {
    return this.ordersService.ship(id, dto, request.user.id);
  }

  @Patch(':id/payment-status')
  @Roles(Role.ADMIN)
  updatePaymentStatus(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePaymentStatusDto,
  ) {
    return this.ordersService.updatePaymentStatus(id, dto.status, request.user.id);
  }
}
