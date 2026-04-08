import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshTokenGuard } from './guards/refresh-token.guard';

const mockCanActivate = { canActivate: () => true };

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
  };

  const mockUsersService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockCanActivate)
      .overrideGuard(RefreshTokenGuard)
      .useValue(mockCanActivate)
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should return user without password field', async () => {
      const user = {
        id: 1,
        email: 'user@test.com',
        password: 'hashed',
        createdAt: new Date(),
      };
      mockUsersService.create.mockResolvedValue(user);

      const result = await controller.register({
        email: 'user@test.com',
        password: 'password123',
      });

      expect(result).not.toHaveProperty('password');
      expect(result).toMatchObject({ id: 1, email: 'user@test.com' });
    });

    it('should propagate ConflictException when email is in use', async () => {
      mockUsersService.create.mockRejectedValue(
        new ConflictException('Email is already in use'),
      );

      await expect(
        controller.register({ email: 'dup@test.com', password: 'pass123' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should return accessToken and refreshToken on success', async () => {
      const tokens = { accessToken: 'acc', refreshToken: 'ref' };
      mockAuthService.login.mockResolvedValue(tokens);

      const result = await controller.login({
        email: 'user@test.com',
        password: 'password123',
      });

      expect(result).toEqual(tokens);
      expect(mockAuthService.login).toHaveBeenCalledWith({
        email: 'user@test.com',
        password: 'password123',
      });
    });

    it('should propagate UnauthorizedException on invalid credentials', async () => {
      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );

      await expect(
        controller.login({ email: 'user@test.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('should return new tokens by delegating to authService.refresh', async () => {
      const tokens = { accessToken: 'new-acc', refreshToken: 'new-ref' };
      mockAuthService.refresh.mockResolvedValue(tokens);

      const user = { userId: 1, email: 'user@test.com', tokenId: 10 };
      const result = await controller.refresh(
        { refreshToken: 'old-ref', userId: 1 },
        user,
      );

      expect(result).toEqual(tokens);
      expect(mockAuthService.refresh).toHaveBeenCalledWith(
        1,
        'user@test.com',
        10,
      );
    });
  });

  describe('logout', () => {
    it('should call authService.logout with the current user id', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);
      const user = { userId: 1, email: 'user@test.com' };

      await controller.logout(user);

      expect(mockAuthService.logout).toHaveBeenCalledWith(1);
    });
  });
});
