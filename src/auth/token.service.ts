import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';

import { RefreshToken } from './entities/refresh-token.entity';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
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
    const hashedToken = await bcrypt.hash(rawToken, 10);

    const expiresAt = new Date();
    const expiresInDays = Number(
      this.configService.get<string>('REFRESH_TOKEN_EXPIRES_DAYS', '7'),
    );
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const refreshToken = this.refreshTokenRepository.create({
      token: hashedToken,
      userId,
      expiresAt,
    });
    await this.refreshTokenRepository.save(refreshToken);

    return rawToken;
  }

  async validateRefreshToken(
    rawToken: string,
    userId: number,
  ): Promise<RefreshToken | null> {
    const activeTokens = await this.refreshTokenRepository.find({
      where: { userId, isRevoked: false },
    });

    for (const stored of activeTokens) {
      const matches = await bcrypt.compare(rawToken, stored.token);
      if (matches) {
        if (stored.expiresAt < new Date()) {
          await this.revokeToken(stored.id);
          return null;
        }
        return stored;
      }
    }

    return null;
  }

  async revokeToken(tokenId: number): Promise<void> {
    await this.refreshTokenRepository.update(tokenId, { isRevoked: true });
  }

  async revokeAllUserTokens(userId: number): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true },
    );
  }
}
