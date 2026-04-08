import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { RefreshTokenGuard } from './refresh-token.guard';
import { TokenService } from '../token.service';
import { UsersService } from '../../users/users.service';

const buildContext = (body: Record<string, unknown>): ExecutionContext => {
  const request = { body, user: {} as Record<string, unknown> };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
};

describe('RefreshTokenGuard', () => {
  let guard: RefreshTokenGuard;

  const mockTokenService = {
    validateRefreshToken: jest.fn(),
  };

  const mockUsersService = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenGuard,
        { provide: TokenService, useValue: mockTokenService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    guard = module.get<RefreshTokenGuard>(RefreshTokenGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should throw UnauthorizedException when refreshToken is missing', async () => {
    const ctx = buildContext({ userId: 1 });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when userId is missing', async () => {
    const ctx = buildContext({ refreshToken: 'some-token' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when token is invalid or expired', async () => {
    mockTokenService.validateRefreshToken.mockResolvedValue(null);
    const ctx = buildContext({ refreshToken: 'bad-token', userId: 1 });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when user is not found', async () => {
    mockTokenService.validateRefreshToken.mockResolvedValue({ id: 10 });
    mockUsersService.findById.mockResolvedValue(null);
    const ctx = buildContext({ refreshToken: 'valid-token', userId: 1 });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should return true and attach user to request when valid', async () => {
    const tokenRecord = { id: 10 };
    const user = { id: 1, email: 'user@test.com' };
    mockTokenService.validateRefreshToken.mockResolvedValue(tokenRecord);
    mockUsersService.findById.mockResolvedValue(user);

    const request = { body: { refreshToken: 'valid-token', userId: 1 }, user: {} as Record<string, unknown> };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(request.user).toEqual({
      userId: 1,
      email: 'user@test.com',
      tokenId: 10,
    });
  });
});
