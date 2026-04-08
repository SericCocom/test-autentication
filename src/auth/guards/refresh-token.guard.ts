import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

import { TokenService } from '../token.service';
import { UsersService } from '../../users/users.service';
import { RequestUser } from '../interfaces/request-user.interface';

@Injectable()
export class RefreshTokenGuard implements CanActivate {
  constructor(
    private readonly tokenService: TokenService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user: RequestUser }>();

    const { refreshToken, userId } = request.body as {
      refreshToken?: string;
      userId?: number;
    };

    if (!refreshToken || !userId) {
      throw new UnauthorizedException(
        'refreshToken and userId are required',
      );
    }

    const numericUserId = Number(userId);
    const tokenRecord = await this.tokenService.validateRefreshToken(
      refreshToken,
      numericUserId,
    );

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.usersService.findById(numericUserId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    request.user = {
      userId: user.id,
      email: user.email,
      tokenId: tokenRecord.id,
    };

    return true;
  }
}
