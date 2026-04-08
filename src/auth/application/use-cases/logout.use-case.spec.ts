import { Test, TestingModule } from '@nestjs/testing';

import { LogoutUseCase } from './logout.use-case';
import { TOKEN_SERVICE } from '../ports/token-service.port';

describe('LogoutUseCase', () => {
  let useCase: LogoutUseCase;

  const mockTokenService = {
    revokeAllUserTokens: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogoutUseCase,
        { provide: TOKEN_SERVICE, useValue: mockTokenService },
      ],
    }).compile();

    useCase = module.get<LogoutUseCase>(LogoutUseCase);
  });

  it('should revoke all tokens for the user', async () => {
    await useCase.execute(1);
    expect(mockTokenService.revokeAllUserTokens).toHaveBeenCalledWith(1);
  });
});
