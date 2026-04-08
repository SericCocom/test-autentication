import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

import { USER_REPOSITORY, type IUserRepository } from '../../domain/repositories/user.repository.interface';
import { TOKEN_SERVICE, type ITokenService } from '../../application/ports/token-service.port';
import { RequestUser } from '../dto/request-user.interface';

@Injectable()
export class RefreshTokenGuard implements CanActivate {
  constructor(
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
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
      throw new UnauthorizedException('refreshToken and userId are required');
    }

    const numericUserId = Number(userId);
    const tokenRecord = await this.tokenService.validateRefreshToken(
      refreshToken,
      numericUserId,
    );

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.userRepo.findById(numericUserId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    request.user = { userId: user.id, email: user.email, tokenId: tokenRecord.id };
    return true;
  }
}
