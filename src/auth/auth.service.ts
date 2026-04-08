import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { UsersService } from '../users/users.service';
import { TokenService } from './token.service';
import { LoginDto } from './dto/login.dto';
import { AuthTokens } from './interfaces/auth-tokens.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tokenService: TokenService,
  ) {}

  async login(loginDto: LoginDto): Promise<AuthTokens> {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user || !(await bcrypt.compare(loginDto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.tokenService.generateAccessToken(
      user.id,
      user.email,
    );
    const refreshToken = await this.tokenService.createRefreshToken(user.id);

    return { accessToken, refreshToken };
  }

  async refresh(
    userId: number,
    email: string,
    tokenId: number,
  ): Promise<AuthTokens> {
    await this.tokenService.revokeToken(tokenId);

    const accessToken = this.tokenService.generateAccessToken(userId, email);
    const refreshToken = await this.tokenService.createRefreshToken(userId);

    return { accessToken, refreshToken };
  }

  async logout(userId: number): Promise<void> {
    await this.tokenService.revokeAllUserTokens(userId);
  }
}
