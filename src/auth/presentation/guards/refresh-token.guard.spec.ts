import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

import { RefreshTokenGuard } from './refresh-token.guard';
import { TOKEN_SERVICE } from '../../application/ports/token-service.port';
import { USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import { User } from '../../domain/entities/user';

const buildContext = (body: Record<string, unknown>): ExecutionContext => {
  const request = { body, user: {} as Record<string, unknown> };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
};

describe('RefreshTokenGuard', () => {
  let guard: RefreshTokenGuard;

  const mockTokenService = { validateRefreshToken: jest.fn() };
  const mockUserRepo = { findById: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenGuard,
        { provide: TOKEN_SERVICE, useValue: mockTokenService },
        { provide: USER_REPOSITORY, useValue: mockUserRepo },
      ],
    }).compile();

    guard = module.get<RefreshTokenGuard>(RefreshTokenGuard);
  });

  it('should throw when refreshToken is missing', async () => {
    await expect(guard.canActivate(buildContext({ userId: 1 }))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw when userId is missing', async () => {
    await expect(
      guard.canActivate(buildContext({ refreshToken: 'tok' })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw when token is invalid', async () => {
    mockTokenService.validateRefreshToken.mockResolvedValue(null);
    await expect(
      guard.canActivate(buildContext({ refreshToken: 'bad', userId: 1 })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw when user is not found', async () => {
    mockTokenService.validateRefreshToken.mockResolvedValue({ id: 10 });
    mockUserRepo.findById.mockResolvedValue(null);
    await expect(
      guard.canActivate(buildContext({ refreshToken: 'tok', userId: 1 })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should return true and attach user when valid', async () => {
    mockTokenService.validateRefreshToken.mockResolvedValue({ id: 10 });
    mockUserRepo.findById.mockResolvedValue(new User(1, 'user@test.com', 'hashed', new Date()));

    const request = { body: { refreshToken: 'tok', userId: 1 }, user: {} as Record<string, unknown> };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(request.user).toEqual({ userId: 1, email: 'user@test.com', tokenId: 10 });
  });
});
