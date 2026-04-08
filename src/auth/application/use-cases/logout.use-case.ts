import { Inject, Injectable } from '@nestjs/common';

import { TOKEN_SERVICE, type ITokenService } from '../ports/token-service.port';

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
  ) {}

  async execute(userId: number): Promise<void> {
    await this.tokenService.revokeAllUserTokens(userId);
  }
}
