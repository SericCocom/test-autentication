import { Test, TestingModule } from '@nestjs/testing';

import { RefreshTokensUseCase } from './refresh-tokens.use-case';
import { TOKEN_SERVICE } from '../ports/token-service.port';

describe('RefreshTokensUseCase', () => {
  let useCase: RefreshTokensUseCase;

  const mockTokenService = {
    revokeToken: jest.fn().mockResolvedValue(undefined),
    generateAccessToken: jest.fn().mockReturnValue('new-access-token'),
    createRefreshToken: jest.fn().mockResolvedValue('new-refresh-token'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokensUseCase,
        { provide: TOKEN_SERVICE, useValue: mockTokenService },
      ],
    }).compile();

    useCase = module.get<RefreshTokensUseCase>(RefreshTokensUseCase);
  });

  it('should revoke old token and return new tokens', async () => {
    const result = await useCase.execute(1, 'user@test.com', 42);

    expect(mockTokenService.revokeToken).toHaveBeenCalledWith(42);
    expect(mockTokenService.generateAccessToken).toHaveBeenCalledWith(1, 'user@test.com');
    expect(mockTokenService.createRefreshToken).toHaveBeenCalledWith(1);
    expect(result).toEqual({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });
  });
});
