# Clean Architecture en NestJS

Aplica esta guía cada vez que crees, muevas o modifiques código en este proyecto.

---

## La regla de dependencia

```
Presentation → Application → Domain ← (implementado por) Infrastructure
```

- El código de capas **externas** puede importar de capas **internas**.
- El código de capas **internas** NUNCA importa de capas externas.
- La infraestructura implementa interfaces del dominio/aplicación.

---

## Estructura de directorios

```
src/auth/
├── domain/                        ← capa más interna
│   ├── entities/                  ← clases puras de TypeScript (sin decoradores)
│   └── repositories/              ← interfaces (ports) con injection tokens
├── application/
│   ├── ports/                     ← interfaces para servicios externos
│   └── use-cases/                 ← un caso de uso por clase (@Injectable)
├── infrastructure/                ← implementaciones concretas
│   ├── persistence/               ← ORM entities + repository implementations
│   └── security/                  ← JWT, bcrypt, etc.
└── presentation/                  ← adaptadores HTTP
    ├── controllers/
    ├── guards/
    ├── strategies/
    ├── decorators/
    └── dto/
```

---

## Capa 1 — Domain

### Entidades de dominio
- Clases TypeScript puras: `class User { ... }`
- **Cero** decoradores de NestJS/TypeORM/Swagger
- Pueden tener métodos de lógica de negocio: `isExpired()`, `isValid()`
- Constructor con todos los campos como `readonly`

```typescript
// src/auth/domain/entities/user.ts
export class User {
  constructor(
    public readonly id: number,
    public readonly email: string,
    public readonly password: string,
    public readonly createdAt: Date,
  ) {}
}
```

### Interfaces de repositorio (ports)
- Definen el CONTRATO, no la implementación
- Incluyen el injection token (`Symbol`) en el mismo archivo
- Solo usan tipos del dominio, nunca de NestJS/TypeORM

```typescript
// src/auth/domain/repositories/user.repository.interface.ts
import { User } from '../entities/user';

export const USER_REPOSITORY = Symbol('IUserRepository');

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: number): Promise<User | null>;
  existsByEmail(email: string): Promise<boolean>;
  create(email: string, hashedPassword: string): Promise<User>;
}
```

---

## Capa 2 — Application

### Ports (interfaces para servicios externos)
- Definen contratos para infraestructura que el dominio no puede conocer
- `IPasswordHasher`, `ITokenService`, `IEmailService`, etc.
- Incluyen su injection token en el mismo archivo

```typescript
// src/auth/application/ports/password-hasher.port.ts
export const PASSWORD_HASHER = Symbol('IPasswordHasher');

export interface IPasswordHasher {
  hash(plain: string): Promise<string>;
  compare(plain: string, hashed: string): Promise<boolean>;
}
```

### Use Cases (un caso de uso = una clase)
- Decorados con `@Injectable()`
- Constructor recibe solo interfaces (nunca clases concretas)
- Usa `@Inject(TOKEN)` para injection tokens tipo Symbol
- Un método público: `execute(...)`
- Orquestan repositorios y ports, no contienen lógica de infraestructura
- Pueden lanzar excepciones de `@nestjs/common` (`UnauthorizedException`, `ConflictException`)

```typescript
// src/auth/application/use-cases/login.use-case.ts
@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: IPasswordHasher,
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
  ) {}

  async execute(email: string, password: string): Promise<AuthTokens> { ... }
}
```

**Regla**: Si un use case necesita más de 3 repositorios/ports, probablemente está haciendo demasiado.

---

## Capa 3 — Infrastructure

### ORM Entities (no son entidades de dominio)
- Tienen decoradores de TypeORM (`@Entity`, `@Column`, etc.)
- Nombre: `*.orm-entity.ts` para distinguirlas de las de dominio
- No se exportan fuera del módulo `AuthModule`

```typescript
// src/auth/infrastructure/persistence/user.orm-entity.ts
@Entity('users')
export class UserOrmEntity {
  @PrimaryGeneratedColumn() id: number;
  @Column({ unique: true }) email: string;
  // ...
}
```

### Repository Implementations
- Implementan la interfaz del dominio
- Hacen el mapeo ORM Entity ↔ Domain Entity
- Método privado `toDomain(orm: XOrmEntity): X { ... }`
- `@Injectable()` + usan `@InjectRepository(XOrmEntity)`

```typescript
@Injectable()
export class UserTypeOrmRepository implements IUserRepository {
  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly repo: Repository<UserOrmEntity>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    const orm = await this.repo.findOne({ where: { email } });
    return orm ? this.toDomain(orm) : null;
  }

  private toDomain(orm: UserOrmEntity): User {
    return new User(orm.id, orm.email, orm.password, orm.createdAt);
  }
}
```

### Security Services
- Implementan ports de la capa Application
- Pueden usar `@Inject(TOKEN)` para depender de otros ports

---

## Capa 4 — Presentation

### Controllers
- Usan use cases, nunca repositorios directamente
- Un controller por recurso/feature
- DTOs de entrada/salida solo en esta capa
- Todos los endpoints documentados con decoradores Swagger

```typescript
@Post('login')
async login(@Body() dto: LoginDto): Promise<AuthTokensDto> {
  return this.loginUseCase.execute(dto.email, dto.password);
}
```

### Guards
- Implementan `CanActivate`
- Pueden usar ports via `@Inject(TOKEN)` (no usan use cases)
- Adjuntan el usuario al request: `request.user = { userId, email, tokenId }`

### DTOs
- Solo en presentation — definen la forma del contrato HTTP
- `@ApiProperty` en cada campo
- Los DTOs de respuesta son clases (no interfaces) para que Swagger los refleje

---

## Wiring — auth.module.ts

El módulo es la **composition root**: el único lugar donde se mapean interfaces a implementaciones.

```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([UserOrmEntity, RefreshTokenOrmEntity]),
    PassportModule, JwtModule.registerAsync({...}),
  ],
  providers: [
    // Infrastructure → Domain/Application interfaces
    { provide: USER_REPOSITORY,           useClass: UserTypeOrmRepository },
    { provide: REFRESH_TOKEN_REPOSITORY,  useClass: RefreshTokenTypeOrmRepository },
    { provide: PASSWORD_HASHER,           useClass: BcryptPasswordService },
    { provide: TOKEN_SERVICE,             useClass: JwtTokenService },

    // Application use cases
    RegisterUseCase, LoginUseCase, RefreshTokensUseCase, LogoutUseCase,

    // Presentation
    JwtStrategy, JwtAuthGuard, RefreshTokenGuard,
  ],
  controllers: [AuthController],
  exports: [JwtAuthGuard, TOKEN_SERVICE],
})
export class AuthModule {}
```

**Regla**: Los `useClass` solo aparecen en `auth.module.ts`, nunca en use cases o servicios de dominio.

---

## Checklist para cada cambio

### Nueva funcionalidad
- [ ] ¿La lógica de negocio está en dominio (entidad) o aplicación (use case)?
- [ ] ¿El use case depende de interfaces, no de clases concretas?
- [ ] ¿Las ORM entities se mapean a domain entities antes de llegar al use case?
- [ ] ¿El controller llama al use case con `.execute()`?
- [ ] ¿El binding interface→implementación está en `auth.module.ts`?

### Nuevo repositorio
- [ ] Interfaz en `domain/repositories/` con injection token Symbol
- [ ] ORM entity en `infrastructure/persistence/` con sufijo `.orm-entity.ts`
- [ ] Implementación en `infrastructure/persistence/` con método `toDomain()`
- [ ] Binding en `auth.module.ts`

### Nuevo servicio externo (email, SMS, cache)
- [ ] Port (interface) en `application/ports/` con injection token
- [ ] Implementación en `infrastructure/`
- [ ] Binding en `auth.module.ts`

### Importaciones prohibidas
| Desde | No puede importar de |
|-------|---------------------|
| `domain/` | `application/`, `infrastructure/`, `presentation/`, NestJS, TypeORM |
| `application/` | `infrastructure/`, `presentation/`, TypeORM |
| `infrastructure/` | `presentation/` |
| `presentation/` | (puede importar de todo) |

---

## Tests

| Capa | Qué mockear |
|------|-------------|
| Use cases | Los ports/repositories via `@Inject(TOKEN)` |
| Guards | `canActivate()` mockeado via `.overrideGuard()` en controller tests |
| Infrastructure repositories | El `Repository<Entity>` de TypeORM via `getRepositoryToken()` |
| Infrastructure security | Las dependencias inyectadas |
| E2E | Nada — usa la app real con DB de test |
