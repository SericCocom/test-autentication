import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';

import { LoginUseCase } from './login.use-case';
import { USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import { PASSWORD_HASHER } from '../ports/password-hasher.port';
import { TOKEN_SERVICE } from '../ports/token-service.port';
import { User } from '../../domain/entities/user';

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;

  const mockUserRepo = { findByEmail: jest.fn() };
  const mockPasswordHasher = { compare: jest.fn() };
  const mockTokenService = {
    generateAccessToken: jest.fn().mockReturnValue('access-token'),
    createRefreshToken: jest.fn().mockResolvedValue('refresh-token'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginUseCase,
        { provide: USER_REPOSITORY, useValue: mockUserRepo },
        { provide: PASSWORD_HASHER, useValue: mockPasswordHasher },
        { provide: TOKEN_SERVICE, useValue: mockTokenService },
      ],
    }).compile();

    useCase = module.get<LoginUseCase>(LoginUseCase);
  });

  it('should return tokens on valid credentials', async () => {
    const user = new User(1, 'user@test.com', 'hashed', new Date());
    mockUserRepo.findByEmail.mockResolvedValue(user);
    mockPasswordHasher.compare.mockResolvedValue(true);

    const result = await useCase.execute('user@test.com', 'pass');

    expect(result).toEqual({ accessToken: 'access-token', refreshToken: 'refresh-token' });
    expect(mockTokenService.generateAccessToken).toHaveBeenCalledWith(1, 'user@test.com');
    expect(mockTokenService.createRefreshToken).toHaveBeenCalledWith(1);
  });

  it('should throw UnauthorizedException when user does not exist', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null);

    await expect(useCase.execute('ghost@test.com', 'pass')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(mockTokenService.generateAccessToken).not.toHaveBeenCalled();
  });

  it('should throw UnauthorizedException when password is wrong', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(new User(1, 'user@test.com', 'hashed', new Date()));
    mockPasswordHasher.compare.mockResolvedValue(false);

    await expect(useCase.execute('user@test.com', 'wrong')).rejects.toThrow(
      UnauthorizedException,
    );
    expect(mockTokenService.generateAccessToken).not.toHaveBeenCalled();
  });
});
