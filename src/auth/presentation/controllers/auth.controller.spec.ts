import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';

import { AuthController } from './auth.controller';
import { RegisterUseCase } from '../../application/use-cases/register.use-case';
import { LoginUseCase } from '../../application/use-cases/login.use-case';
import { RefreshTokensUseCase } from '../../application/use-cases/refresh-tokens.use-case';
import { LogoutUseCase } from '../../application/use-cases/logout.use-case';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RefreshTokenGuard } from '../guards/refresh-token.guard';

const mockCanActivate = { canActivate: () => true };

describe('AuthController', () => {
  let controller: AuthController;

  const mockRegisterUseCase = { execute: jest.fn() };
  const mockLoginUseCase = { execute: jest.fn() };
  const mockRefreshTokensUseCase = { execute: jest.fn() };
  const mockLogoutUseCase = { execute: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: RegisterUseCase, useValue: mockRegisterUseCase },
        { provide: LoginUseCase, useValue: mockLoginUseCase },
        { provide: RefreshTokensUseCase, useValue: mockRefreshTokensUseCase },
        { provide: LogoutUseCase, useValue: mockLogoutUseCase },
      ],
    })
      .overrideGuard(JwtAuthGuard).useValue(mockCanActivate)
      .overrideGuard(RefreshTokenGuard).useValue(mockCanActivate)
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should delegate to RegisterUseCase.execute', async () => {
      const result = { id: 1, email: 'user@test.com', createdAt: new Date() };
      mockRegisterUseCase.execute.mockResolvedValue(result);

      const response = await controller.register({ email: 'user@test.com', password: 'pass123' });

      expect(response).toEqual(result);
      expect(mockRegisterUseCase.execute).toHaveBeenCalledWith('user@test.com', 'pass123');
    });

    it('should propagate ConflictException', async () => {
      mockRegisterUseCase.execute.mockRejectedValue(new ConflictException());
      await expect(
        controller.register({ email: 'dup@test.com', password: 'pass123' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should delegate to LoginUseCase.execute', async () => {
      const tokens = { accessToken: 'acc', refreshToken: 'ref' };
      mockLoginUseCase.execute.mockResolvedValue(tokens);

      const result = await controller.login({ email: 'user@test.com', password: 'pass' });

      expect(result).toEqual(tokens);
      expect(mockLoginUseCase.execute).toHaveBeenCalledWith('user@test.com', 'pass');
    });

    it('should propagate UnauthorizedException', async () => {
      mockLoginUseCase.execute.mockRejectedValue(new UnauthorizedException());
      await expect(
        controller.login({ email: 'x@test.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('should delegate to RefreshTokensUseCase.execute with user from guard', async () => {
      const tokens = { accessToken: 'new-acc', refreshToken: 'new-ref' };
      mockRefreshTokensUseCase.execute.mockResolvedValue(tokens);

      const user = { userId: 1, email: 'user@test.com', tokenId: 42 };
      const result = await controller.refresh({ refreshToken: 'old', userId: 1 }, user);

      expect(result).toEqual(tokens);
      expect(mockRefreshTokensUseCase.execute).toHaveBeenCalledWith(1, 'user@test.com', 42);
    });
  });

  describe('logout', () => {
    it('should delegate to LogoutUseCase.execute', async () => {
      mockLogoutUseCase.execute.mockResolvedValue(undefined);

      await controller.logout({ userId: 1, email: 'user@test.com' });

      expect(mockLogoutUseCase.execute).toHaveBeenCalledWith(1);
    });
  });
});
