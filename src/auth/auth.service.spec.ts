import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  const mockUsersService = {
    findByEmail: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user without password if validation is successful', async () => {
      const password = 'testpassword';
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = { id: 1, email: 'test@test.com', password: hashedPassword };

      mockUsersService.findByEmail.mockResolvedValue(user);

      const result = await service.validateUser('test@test.com', password);
      expect(result).toEqual(user);
    });

    it('should return null if user does not exist', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser('notfound@test.com', 'pass');
      expect(result).toBeNull();
    });

    it('should return null if password does not match', async () => {
      const password = 'testpassword';
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = { id: 1, email: 'test@test.com', password: hashedPassword };

      mockUsersService.findByEmail.mockResolvedValue(user);

      const result = await service.validateUser('test@test.com', 'wrongpassword');
      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return an access token', async () => {
      const user = { id: 1, email: 'test@test.com' };
      mockJwtService.sign.mockReturnValue('signed_token');
      
      jest.spyOn(service, 'validateUser').mockResolvedValue(user as any);

      const result = await service.login({ email: 'test@test.com', password: 'testpassword' });
      expect(result).toEqual({ access_token: 'signed_token' });
      expect(mockJwtService.sign).toHaveBeenCalledWith({ email: user.email, sub: user.id });
    });

    it('should throw UnauthorizedException if validation fails', async () => {
      jest.spyOn(service, 'validateUser').mockResolvedValue(null);

      await expect(
        service.login({ email: 'test@test.com', password: 'testpassword' }),
      ).rejects.toThrow('Invalid credentials');
    });
  });
});
