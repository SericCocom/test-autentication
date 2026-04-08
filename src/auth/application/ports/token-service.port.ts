export const TOKEN_SERVICE = Symbol('ITokenService');

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  sub: number;
  email: string;
  iat?: number;
  exp?: number;
}

export interface ITokenService {
  generateAccessToken(userId: number, email: string): string;
  createRefreshToken(userId: number): Promise<string>;
  validateRefreshToken(rawToken: string, userId: number): Promise<{ id: number } | null>;
  revokeToken(tokenId: number): Promise<void>;
  revokeAllUserTokens(userId: number): Promise<void>;
}
