import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';

import { TokenService } from './token.service';
import { RefreshToken } from './entities/refresh-token.entity';

describe('TokenService', () => {
  let service: TokenService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('signed.jwt.token'),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        JWT_SECRET: 'test-secret',
        JWT_EXPIRES_IN: '15m',
        REFRESH_TOKEN_EXPIRES_DAYS: '7',
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: getRepositoryToken(RefreshToken), useValue: mockRepository },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateAccessToken', () => {
    it('should call jwtService.sign with the correct payload and options', () => {
      const token = service.generateAccessToken(1, 'user@test.com');

      expect(mockJwtService.sign).toHaveBeenCalledWith(
        { sub: 1, email: 'user@test.com' },
        { secret: 'test-secret', expiresIn: '15m' },
      );
      expect(token).toBe('signed.jwt.token');
    });
  });

  describe('createRefreshToken', () => {
    it('should hash the token and save it, returning the raw token', async () => {
      const savedToken = { id: 1, token: 'hashed', userId: 1 };
      mockRepository.create.mockReturnValue(savedToken);
      mockRepository.save.mockResolvedValue(savedToken);

      const rawToken = await service.createRefreshToken(1);

      expect(typeof rawToken).toBe('string');
      expect(rawToken.length).toBeGreaterThan(0);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 1 }),
      );
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should store a bcrypt hash, not the raw token', async () => {
      let capturedArgs: Partial<RefreshToken> | undefined;
      mockRepository.create.mockImplementation((args: Partial<RefreshToken>) => {
        capturedArgs = args;
        return args;
      });
      mockRepository.save.mockResolvedValue({});

      const rawToken = await service.createRefreshToken(1);

      expect(capturedArgs!.token).not.toBe(rawToken);
      const isHashed = await bcrypt.compare(rawToken, capturedArgs!.token!);
      expect(isHashed).toBe(true);
    });
  });

  describe('validateRefreshToken', () => {
    it('should return the token record when raw token matches a stored hash', async () => {
      const rawToken = 'my-raw-token';
      const hashedToken = await bcrypt.hash(rawToken, 10);
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24);
      const storedToken: Partial<RefreshToken> = {
        id: 1,
        token: hashedToken,
        userId: 1,
        isRevoked: false,
        expiresAt: futureDate,
      };

      mockRepository.find.mockResolvedValue([storedToken]);

      const result = await service.validateRefreshToken(rawToken, 1);

      expect(result).toEqual(storedToken);
    });

    it('should return null when no token matches', async () => {
      mockRepository.find.mockResolvedValue([]);
      const result = await service.validateRefreshToken('wrong-token', 1);
      expect(result).toBeNull();
    });

    it('should revoke and return null when token is expired', async () => {
      const rawToken = 'expired-token';
      const hashedToken = await bcrypt.hash(rawToken, 10);
      const pastDate = new Date(Date.now() - 1000);
      const storedToken: Partial<RefreshToken> = {
        id: 99,
        token: hashedToken,
        userId: 1,
        isRevoked: false,
        expiresAt: pastDate,
      };

      mockRepository.find.mockResolvedValue([storedToken]);
      mockRepository.update.mockResolvedValue({});

      const result = await service.validateRefreshToken(rawToken, 1);

      expect(result).toBeNull();
      expect(mockRepository.update).toHaveBeenCalledWith(99, { isRevoked: true });
    });
  });

  describe('revokeToken', () => {
    it('should mark a single token as revoked', async () => {
      mockRepository.update.mockResolvedValue({});
      await service.revokeToken(5);
      expect(mockRepository.update).toHaveBeenCalledWith(5, { isRevoked: true });
    });
  });

  describe('revokeAllUserTokens', () => {
    it('should revoke all active tokens for a user', async () => {
      mockRepository.update.mockResolvedValue({});
      await service.revokeAllUserTokens(1);
      expect(mockRepository.update).toHaveBeenCalledWith(
        { userId: 1, isRevoked: false },
        { isRevoked: true },
      );
    });
  });
});
