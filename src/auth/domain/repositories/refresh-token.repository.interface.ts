import { RefreshToken } from '../entities/refresh-token';

export const REFRESH_TOKEN_REPOSITORY = Symbol('IRefreshTokenRepository');

export interface IRefreshTokenRepository {
  create(userId: number, hashedToken: string, expiresAt: Date): Promise<RefreshToken>;
  findActiveByUserId(userId: number): Promise<RefreshToken[]>;
  revokeById(id: number): Promise<void>;
  revokeAllByUserId(userId: number): Promise<void>;
}
