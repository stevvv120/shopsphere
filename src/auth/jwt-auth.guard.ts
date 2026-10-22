import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import type { Request } from 'express';
import { AuthenticatedUser } from './auth-user.interface';

interface AccessTokenPayload {
  sub: number;
  email: string;
  role: Role;
}

type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const [scheme, token, ...extraParts] = authorization?.trim().split(/\s+/) ?? [];

    if (
      scheme?.toLowerCase() !== 'bearer' ||
      !token ||
      extraParts.length > 0
    ) {
      throw new UnauthorizedException('A Bearer access token is required.');
    }

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw new UnauthorizedException('The access token is invalid or expired.');
    }

    const validRoles = Object.values(Role) as string[];
    if (
      !Number.isSafeInteger(payload.sub) ||
      typeof payload.email !== 'string' ||
      !validRoles.includes(payload.role)
    ) {
      throw new UnauthorizedException('The access token is invalid or expired.');
    }

    request.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    return true;
  }
}
