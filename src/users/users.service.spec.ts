import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';

import { UsersService } from './users.service';
import { User } from './user.entity';

describe('UsersService', () => {
  let service: UsersService;

  const mockRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockRepository },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByEmail', () => {
    it('should return a user when the email exists', async () => {
      const user = { id: 1, email: 'user@test.com' };
      mockRepository.findOne.mockResolvedValue(user);

      const result = await service.findByEmail('user@test.com');

      expect(result).toEqual(user);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'user@test.com' },
      });
    });

    it('should return null when the email does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      const result = await service.findByEmail('missing@test.com');
      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return a user when the id exists', async () => {
      const user = { id: 1, email: 'user@test.com' };
      mockRepository.findOne.mockResolvedValue(user);

      const result = await service.findById(1);

      expect(result).toEqual(user);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should return null when the id does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      const result = await service.findById(999);
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should hash the password and save the user', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      const dto = { email: 'new@test.com', password: 'plain123' };
      const savedUser = { id: 1, email: dto.email, password: 'hashed' };

      mockRepository.create.mockReturnValue(savedUser);
      mockRepository.save.mockResolvedValue(savedUser);

      const result = await service.create(dto);

      expect(result).toEqual(savedUser);
      const createArg = mockRepository.create.mock.calls[0][0] as Partial<User>;
      expect(createArg.password).not.toBe(dto.password);
      const isHashed = await bcrypt.compare(dto.password, createArg.password!);
      expect(isHashed).toBe(true);
    });

    it('should throw ConflictException when email is already in use', async () => {
      mockRepository.findOne.mockResolvedValue({ id: 1, email: 'dup@test.com' });

      await expect(
        service.create({ email: 'dup@test.com', password: 'pass123' }),
      ).rejects.toThrow(ConflictException);

      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });
});
