import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

import {
  REFRESH_TOKEN_REPOSITORY,
  type IRefreshTokenRepository,
} from '../../domain/repositories/refresh-token.repository.interface';
import { PASSWORD_HASHER, type IPasswordHasher } from '../../application/ports/password-hasher.port';
import { type ITokenService, type JwtPayload } from '../../application/ports/token-service.port';

@Injectable()
export class JwtTokenService implements ITokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepo: IRefreshTokenRepository,
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: IPasswordHasher,
  ) {}

  generateAccessToken(userId: number, email: string): string {
    const payload: JwtPayload = { sub: userId, email };
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '15m') as any,
    });
  }

  async createRefreshToken(userId: number): Promise<string> {
    const rawToken = crypto.randomBytes(64).toString('hex');
    const hashedToken = await this.passwordHasher.hash(rawToken);

    const expiresAt = new Date();
    expiresAt.setDate(
      expiresAt.getDate() +
        Number(this.configService.get<string>('REFRESH_TOKEN_EXPIRES_DAYS', '7')),
    );

    await this.refreshTokenRepo.create(userId, hashedToken, expiresAt);
    return rawToken;
  }

  async validateRefreshToken(
    rawToken: string,
    userId: number,
  ): Promise<{ id: number } | null> {
    const activeTokens = await this.refreshTokenRepo.findActiveByUserId(userId);

    for (const token of activeTokens) {
      if (token.isExpired()) {
        await this.refreshTokenRepo.revokeById(token.id);
        continue;
      }
      const matches = await this.passwordHasher.compare(rawToken, token.token);
      if (matches) return { id: token.id };
    }

    return null;
  }

  async revokeToken(tokenId: number): Promise<void> {
    await this.refreshTokenRepo.revokeById(tokenId);
  }

  async revokeAllUserTokens(userId: number): Promise<void> {
    await this.refreshTokenRepo.revokeAllByUserId(userId);
  }
}
