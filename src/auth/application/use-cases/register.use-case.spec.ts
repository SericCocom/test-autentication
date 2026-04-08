import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';

import { RegisterUseCase } from './register.use-case';
import { USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import { PASSWORD_HASHER } from '../ports/password-hasher.port';
import { User } from '../../domain/entities/user';

describe('RegisterUseCase', () => {
  let useCase: RegisterUseCase;

  const mockUserRepo = {
    existsByEmail: jest.fn(),
    create: jest.fn(),
  };

  const mockPasswordHasher = {
    hash: jest.fn().mockResolvedValue('hashed-password'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterUseCase,
        { provide: USER_REPOSITORY, useValue: mockUserRepo },
        { provide: PASSWORD_HASHER, useValue: mockPasswordHasher },
      ],
    }).compile();

    useCase = module.get<RegisterUseCase>(RegisterUseCase);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should hash the password and create the user', async () => {
    const now = new Date();
    mockUserRepo.existsByEmail.mockResolvedValue(false);
    mockUserRepo.create.mockResolvedValue(new User(1, 'user@test.com', 'hashed-password', now));

    const result = await useCase.execute('user@test.com', 'plainpass');

    expect(mockPasswordHasher.hash).toHaveBeenCalledWith('plainpass');
    expect(mockUserRepo.create).toHaveBeenCalledWith('user@test.com', 'hashed-password');
    expect(result).toEqual({ id: 1, email: 'user@test.com', createdAt: now });
  });

  it('should throw ConflictException when email already exists', async () => {
    mockUserRepo.existsByEmail.mockResolvedValue(true);

    await expect(useCase.execute('dup@test.com', 'pass123')).rejects.toThrow(
      ConflictException,
    );
    expect(mockUserRepo.create).not.toHaveBeenCalled();
  });
});
