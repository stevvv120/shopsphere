import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateShippingAddressDto } from './dto/update-shipping-address.dto';

const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  shippingName: true,
  shippingPhone: true,
  shippingAddress: true,
} as const;

type PublicUser = {
  id: number;
  name: string;
  email: string;
  role: Role;
  shippingName: string | null;
  shippingPhone: string | null;
  shippingAddress: string | null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    this.assertPasswordLength(dto.password);
    const passwordHash = await bcrypt.hash(dto.password, 12);

    try {
      const user = await this.prisma.user.create({
        data: {
          name: dto.name.trim(),
          email: dto.email.trim().toLowerCase(),
          passwordHash,
        },
        select: safeUserSelect,
      });
      return this.createSession(user);
    } catch (error) {
      if ((error as { code?: string } | null)?.code === 'P2002') {
        throw new ConflictException('An account with that email already exists.');
      }
      throw error;
    }
  }

  async login(dto: LoginDto) {
    this.assertPasswordLength(dto.password);
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
      select: { ...safeUserSelect, passwordHash: true },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const { passwordHash: _passwordHash, ...publicUser } = user;
    return this.createSession(publicUser);
  }

  async updateShippingAddress(userId: number, dto: UpdateShippingAddressDto) {
    const updated = await this.prisma.user.updateMany({
      where: { id: userId, role: Role.CUSTOMER },
      data: {
        shippingName: dto.shippingName,
        shippingPhone: dto.shippingPhone,
        shippingAddress: dto.shippingAddress,
      },
    });
    if (updated.count !== 1) throw new NotFoundException('Customer account not found.');

    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: safeUserSelect,
    });
  }

  private async createSession(user: PublicUser) {
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 900,
      user,
    };
  }

  private assertPasswordLength(password: string): void {
    const byteLength = Buffer.byteLength(password, 'utf8');
    if (byteLength < 8 || byteLength > 72) {
      throw new BadRequestException(
        'Password must be between 8 and 72 bytes when encoded as UTF-8.',
      );
    }
  }
}
