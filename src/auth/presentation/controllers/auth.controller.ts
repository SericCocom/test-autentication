import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { RegisterUseCase } from '../../application/use-cases/register.use-case';
import { LoginUseCase } from '../../application/use-cases/login.use-case';
import { RefreshTokensUseCase } from '../../application/use-cases/refresh-tokens.use-case';
import { LogoutUseCase } from '../../application/use-cases/logout.use-case';
import type { AuthTokens } from '../../application/ports/token-service.port';

import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RefreshTokenGuard } from '../guards/refresh-token.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import type { RequestUser } from '../dto/request-user.interface';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { AuthTokensDto } from '../dto/auth-tokens.dto';
import { UserResponseDto } from '../dto/user-response.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokensUseCase: RefreshTokensUseCase,
    private readonly logoutUseCase: LogoutUseCase,
  ) {}

  @ApiOperation({ summary: 'Register a new user', description: 'Creates a new account. Password is hashed before storage.' })
  @ApiResponse({ status: 201, description: 'User created', type: UserResponseDto })
  @ApiConflictResponse({ description: 'Email is already in use' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @Post('register')
  async register(@Body() dto: RegisterDto): Promise<UserResponseDto> {
    return this.registerUseCase.execute(dto.email, dto.password);
  }

  @ApiOperation({ summary: 'Obtain access and refresh tokens' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login successful', type: AuthTokensDto })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() dto: LoginDto): Promise<AuthTokens> {
    return this.loginUseCase.execute(dto.email, dto.password);
  }

  @ApiOperation({
    summary: 'Rotate tokens (refresh)',
    description: 'Old refresh token is immediately revoked. Reusing a consumed token returns 401.',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, description: 'Tokens rotated', type: AuthTokensDto })
  @ApiUnauthorizedResponse({ description: 'Refresh token invalid, expired, or already used' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  async refresh(
    @Body() _dto: RefreshTokenDto,
    @CurrentUser() user: RequestUser,
  ): Promise<AuthTokens> {
    return this.refreshTokensUseCase.execute(user.userId, user.email, user.tokenId!);
  }

  @ApiOperation({ summary: 'Revoke all refresh tokens (logout)' })
  @ApiBearerAuth('access-token')
  @ApiResponse({ status: 204, description: 'Logged out' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid Bearer token' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@CurrentUser() user: RequestUser): Promise<void> {
    return this.logoutUseCase.execute(user.userId);
  }
}
