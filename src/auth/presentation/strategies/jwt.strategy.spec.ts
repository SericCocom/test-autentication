import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { JwtStrategy } from './jwt.strategy';
import type { JwtPayload } from '../../application/ports/token-service.port';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  const mockConfigService = {
    get: (key: string) => (key === 'JWT_SECRET' ? 'test-secret' : undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should return RequestUser from a valid JWT payload', () => {
    const payload: JwtPayload = { sub: 1, email: 'user@test.com' };
    expect(strategy.validate(payload)).toEqual({ userId: 1, email: 'user@test.com' });
  });
});
