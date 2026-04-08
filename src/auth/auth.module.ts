import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// Domain tokens
import { USER_REPOSITORY } from './domain/repositories/user.repository.interface';
import { REFRESH_TOKEN_REPOSITORY } from './domain/repositories/refresh-token.repository.interface';

// Application tokens & use cases
import { PASSWORD_HASHER } from './application/ports/password-hasher.port';
import { TOKEN_SERVICE } from './application/ports/token-service.port';
import { RegisterUseCase } from './application/use-cases/register.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { RefreshTokensUseCase } from './application/use-cases/refresh-tokens.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';

// Infrastructure — ORM entities
import { UserOrmEntity } from './infrastructure/persistence/user.orm-entity';
import { RefreshTokenOrmEntity } from './infrastructure/persistence/refresh-token.orm-entity';

// Infrastructure — adapters (implementations)
import { UserTypeOrmRepository } from './infrastructure/persistence/user.typeorm-repository';
import { RefreshTokenTypeOrmRepository } from './infrastructure/persistence/refresh-token.typeorm-repository';
import { BcryptPasswordService } from './infrastructure/security/bcrypt-password.service';
import { JwtTokenService } from './infrastructure/security/jwt-token.service';

// Presentation
import { AuthController } from './presentation/controllers/auth.controller';
import { JwtAuthGuard } from './presentation/guards/jwt-auth.guard';
import { RefreshTokenGuard } from './presentation/guards/refresh-token.guard';
import { JwtStrategy } from './presentation/strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    TypeOrmModule.forFeature([UserOrmEntity, RefreshTokenOrmEntity]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        signOptions: { expiresIn: configService.get<string>('JWT_EXPIRES_IN', '15m') as any },
      }),
    }),
  ],
  providers: [
    // ── Port → Adapter bindings (Dependency Inversion) ─────────────────────
    { provide: USER_REPOSITORY,          useClass: UserTypeOrmRepository },
    { provide: REFRESH_TOKEN_REPOSITORY, useClass: RefreshTokenTypeOrmRepository },
    { provide: PASSWORD_HASHER,          useClass: BcryptPasswordService },
    { provide: TOKEN_SERVICE,            useClass: JwtTokenService },

    // ── Application use cases ───────────────────────────────────────────────
    RegisterUseCase,
    LoginUseCase,
    RefreshTokensUseCase,
    LogoutUseCase,

    // ── Presentation ────────────────────────────────────────────────────────
    JwtStrategy,
    JwtAuthGuard,
    RefreshTokenGuard,
  ],
  controllers: [AuthController],
  exports: [JwtAuthGuard, TOKEN_SERVICE, USER_REPOSITORY],
})
export class AuthModule {}
