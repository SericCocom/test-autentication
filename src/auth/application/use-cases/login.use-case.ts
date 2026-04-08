import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';

import { USER_REPOSITORY, type IUserRepository } from '../../domain/repositories/user.repository.interface';
import { PASSWORD_HASHER, type IPasswordHasher } from '../ports/password-hasher.port';
import { TOKEN_SERVICE, type AuthTokens, type ITokenService } from '../ports/token-service.port';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: IPasswordHasher,
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
  ) {}

  async execute(email: string, password: string): Promise<AuthTokens> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await this.passwordHasher.compare(password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.tokenService.generateAccessToken(user.id, user.email);
    const refreshToken = await this.tokenService.createRefreshToken(user.id);

    return { accessToken, refreshToken };
  }
}
