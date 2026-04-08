import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RegisterUserDto } from '../users/dto/register-user.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthTokensDto } from './dto/auth-tokens.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthTokens } from './interfaces/auth-tokens.interface';
import type { RequestUser } from './interfaces/request-user.interface';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  // ─── Register ──────────────────────────────────────────────────────────────

  @ApiOperation({
    summary: 'Register a new user',
    description: 'Creates a new account. The password is hashed before storage.',
  })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: UserResponseDto,
  })
  @ApiConflictResponse({ description: 'Email is already in use' })
  @ApiResponse({ status: 400, description: 'Validation error (invalid email, short password…)' })
  @Post('register')
  async register(@Body() registerUserDto: RegisterUserDto): Promise<UserResponseDto> {
    const user = await this.usersService.create(registerUserDto);
    const { password: _pw, ...result } = user;
    return result as UserResponseDto;
  }

  // ─── Login ─────────────────────────────────────────────────────────────────

  @ApiOperation({
    summary: 'Obtain access and refresh tokens',
    description:
      'Validates credentials and returns a short-lived access token (JWT) and a long-lived refresh token (opaque, stored in DB).',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: AuthTokensDto,
  })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<AuthTokens> {
    return this.authService.login(loginDto);
  }

  // ─── Refresh ───────────────────────────────────────────────────────────────

  @ApiOperation({
    summary: 'Rotate tokens (refresh)',
    description:
      'Exchanges a valid refresh token for a new access token and a new refresh token. ' +
      'The old refresh token is immediately revoked (token rotation). ' +
      'Reusing a consumed token returns 401.',
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Tokens rotated successfully',
    type: AuthTokensDto,
  })
  @ApiUnauthorizedResponse({ description: 'Refresh token is invalid, expired, or already used' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  async refresh(
    @Body() _dto: RefreshTokenDto,
    @CurrentUser() user: RequestUser,
  ): Promise<AuthTokens> {
    return this.authService.refresh(user.userId, user.email, user.tokenId!);
  }

  // ─── Logout ────────────────────────────────────────────────────────────────

  @ApiOperation({
    summary: 'Revoke all refresh tokens (logout)',
    description:
      'Invalidates every active refresh token for the authenticated user. ' +
      'The access token remains valid until it expires (stateless JWT).',
  })
  @ApiBearerAuth('access-token')
  @ApiResponse({ status: 204, description: 'Logged out — all refresh tokens revoked' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid Bearer token' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@CurrentUser() user: RequestUser): Promise<void> {
    return this.authService.logout(user.userId);
  }
}
