import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RefreshToken } from '../../domain/entities/refresh-token';
import { IRefreshTokenRepository } from '../../domain/repositories/refresh-token.repository.interface';
import { RefreshTokenOrmEntity } from './refresh-token.orm-entity';

@Injectable()
export class RefreshTokenTypeOrmRepository implements IRefreshTokenRepository {
  constructor(
    @InjectRepository(RefreshTokenOrmEntity)
    private readonly repo: Repository<RefreshTokenOrmEntity>,
  ) {}

  async create(userId: number, hashedToken: string, expiresAt: Date): Promise<RefreshToken> {
    const orm = this.repo.create({ userId, token: hashedToken, expiresAt });
    const saved = await this.repo.save(orm);
    return this.toDomain(saved);
  }

  async findActiveByUserId(userId: number): Promise<RefreshToken[]> {
    const orms = await this.repo.find({ where: { userId, isRevoked: false } });
    return orms.map((orm) => this.toDomain(orm));
  }

  async revokeById(id: number): Promise<void> {
    await this.repo.update(id, { isRevoked: true });
  }

  async revokeAllByUserId(userId: number): Promise<void> {
    await this.repo.update({ userId, isRevoked: false }, { isRevoked: true });
  }

  private toDomain(orm: RefreshTokenOrmEntity): RefreshToken {
    return new RefreshToken(
      orm.id,
      orm.token,
      orm.userId,
      orm.expiresAt,
      orm.isRevoked,
      orm.createdAt,
    );
  }
}
