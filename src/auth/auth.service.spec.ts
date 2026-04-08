import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { TokenService } from './token.service';

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    findByEmail: jest.fn(),
  };

  const mockTokenService = {
    generateAccessToken: jest.fn().mockReturnValue('access_token'),
    createRefreshToken: jest.fn().mockResolvedValue('refresh_token'),
    revokeToken: jest.fn().mockResolvedValue(undefined),
    revokeAllUserTokens: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: TokenService, useValue: mockTokenService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should return access and refresh tokens on valid credentials', async () => {
      const password = 'testpassword';
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = { id: 1, email: 'test@test.com', password: hashedPassword };

      mockUsersService.findByEmail.mockResolvedValue(user);

      const result = await service.login({
        email: 'test@test.com',
        password,
      });

      expect(result).toEqual({
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      });
      expect(mockTokenService.generateAccessToken).toHaveBeenCalledWith(
        user.id,
        user.email,
      );
      expect(mockTokenService.createRefreshToken).toHaveBeenCalledWith(user.id);
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nope@test.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is wrong', async () => {
      const hashedPassword = await bcrypt.hash('correctpassword', 10);
      mockUsersService.findByEmail.mockResolvedValue({
        id: 1,
        email: 'test@test.com',
        password: hashedPassword,
      });

      await expect(
        service.login({ email: 'test@test.com', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('should rotate refresh token and return new tokens', async () => {
      const result = await service.refresh(1, 'test@test.com', 42);

      expect(mockTokenService.revokeToken).toHaveBeenCalledWith(42);
      expect(mockTokenService.generateAccessToken).toHaveBeenCalledWith(
        1,
        'test@test.com',
      );
      expect(mockTokenService.createRefreshToken).toHaveBeenCalledWith(1);
      expect(result).toEqual({
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      });
    });
  });

  describe('logout', () => {
    it('should revoke all tokens for the user', async () => {
      await service.logout(1);
      expect(mockTokenService.revokeAllUserTokens).toHaveBeenCalledWith(1);
    });
  });
});
