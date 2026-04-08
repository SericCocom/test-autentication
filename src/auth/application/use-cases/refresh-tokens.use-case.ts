import { Inject, Injectable } from '@nestjs/common';

import { TOKEN_SERVICE, type AuthTokens, type ITokenService } from '../ports/token-service.port';

@Injectable()
export class RefreshTokensUseCase {
  constructor(
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
  ) {}

  async execute(userId: number, email: string, tokenId: number): Promise<AuthTokens> {
    await this.tokenService.revokeToken(tokenId);

    const accessToken = this.tokenService.generateAccessToken(userId, email);
    const refreshToken = await this.tokenService.createRefreshToken(userId);

    return { accessToken, refreshToken };
  }
}
