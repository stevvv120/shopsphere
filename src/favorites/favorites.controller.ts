import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { SyncFavoritesDto } from './dto/sync-favorites.dto';
import { FavoritesService } from './favorites.service';

type AuthenticatedRequest = Request & { user: AuthenticatedUser };

@Controller('favorites')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CUSTOMER)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  findMine(@Req() request: AuthenticatedRequest) {
    return this.favoritesService.findMine(request.user.id);
  }

  @Post('sync')
  sync(
    @Req() request: AuthenticatedRequest,
    @Body() dto: SyncFavoritesDto,
  ) {
    return this.favoritesService.sync(request.user.id, dto);
  }

  @Post(':productId')
  @HttpCode(HttpStatus.OK)
  add(
    @Req() request: AuthenticatedRequest,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    return this.favoritesService.add(request.user.id, productId);
  }

  @Delete(':productId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('productId', ParseIntPipe) productId: number,
  ): Promise<void> {
    return this.favoritesService.remove(request.user.id, productId);
  }
}
