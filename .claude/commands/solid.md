# NestJS SOLID Review

You are reviewing NestJS code in this project. Apply the following SOLID checklist every time you create or modify a service, guard, strategy, controller, or module.

---

## S — Single Responsibility Principle

- Each `@Injectable()` class must have **one reason to change**.
- `AuthService` orchestrates auth flow only — never signs tokens directly.
- `TokenService` handles token operations only — never validates credentials.
- `UsersService` handles user CRUD only — never touches tokens.
- **Check:** If you can describe a class with "and", split it.

## O — Open/Closed Principle

- New auth strategies (Google, GitHub, etc.) must be added as new `PassportStrategy` subclasses, NOT by modifying `AuthService`.
- Guards must be composable, not monolithic.
- **Check:** Adding a new OAuth provider should not require changes to existing services.

## L — Liskov Substitution Principle

- All guards must implement `CanActivate` and return `boolean | Promise<boolean>`.
- `JwtAuthGuard extends AuthGuard('jwt')` — never break the Passport contract.
- `RefreshTokenGuard implements CanActivate` — same interface, swappable.
- **Check:** Can you swap `JwtAuthGuard` for `RefreshTokenGuard` on any route without changing the controller signature?

## I — Interface Segregation Principle

- Never use `any` for request user types. Use `RequestUser` interface.
- Never use `any` for JWT payloads. Use `JwtPayload` interface.
- Keep interfaces small and focused:
  - `JwtPayload` → only what is encoded in the token (`sub`, `email`)
  - `AuthTokens` → only what is returned to the client (`accessToken`, `refreshToken`)
  - `RequestUser` → only what a guard attaches to `req.user` (`userId`, `email`, `tokenId?`)
- **Check:** No method should receive an interface with fields it doesn't use.

## D — Dependency Inversion Principle

- Controllers depend on `AuthService`, never on `TokenService` or `UsersService` directly (except `register` which is a UsersService concern until a dedicated facade exists).
- `AuthService` depends on `TokenService` and `UsersService` — both are injected, never instantiated.
- `TokenService` depends on `JwtService`, `ConfigService`, and the `RefreshToken` repository — all injected.
- **Check:** No `new SomeService()` calls. Everything is injected via constructor.

---

## Architecture Map

```
AuthController
  ├── AuthService          ← orchestrates login / refresh / logout
  │     ├── TokenService   ← generates/validates/revokes tokens (SRP)
  │     └── UsersService   ← finds users by email or id
  ├── JwtAuthGuard         ← protects routes requiring access token
  └── RefreshTokenGuard    ← validates refresh token + attaches RequestUser
```

## Mandatory patterns in this project

### New route that requires auth:
```typescript
@UseGuards(JwtAuthGuard)
@Get('protected')
myRoute(@CurrentUser() user: RequestUser) { ... }
```

### New endpoint returning tokens:
```typescript
// Always return AuthTokens interface — never ad-hoc objects
async myMethod(): Promise<AuthTokens> {
  return { accessToken: '...', refreshToken: '...' };
}
```

### New service that handles tokens:
- Inject `TokenService` — never inject `JwtService` directly in anything other than `TokenService`.

### Adding a new Passport strategy:
1. Create `src/auth/strategies/<name>.strategy.ts` extending `PassportStrategy`.
2. Create `src/auth/guards/<name>.guard.ts` extending `AuthGuard('<name>')` or implementing `CanActivate`.
3. Register both in `AuthModule.providers`.
4. Do NOT modify `AuthService`.

## Swagger / API documentation checklist

Every time you add or modify a controller endpoint or DTO, apply these rules:

### Controllers
- `@ApiTags('tag-name')` on every controller class — groups endpoints in Swagger UI.
- `@ApiOperation({ summary, description })` on every route method.
- `@ApiResponse({ status, description, type })` for every possible HTTP status (200, 201, 400, 401, 409…).
- Use `@ApiUnauthorizedResponse` and `@ApiConflictResponse` helpers instead of generic `@ApiResponse` where semantically correct.
- `@ApiBearerAuth('access-token')` on every route protected by `JwtAuthGuard`.
- `@ApiBody({ type: DtoClass })` when the inferred type from `@Body()` is not picked up correctly.

### DTOs
- Every field in a request DTO must have `@ApiProperty({ example, description })`.
- Every response DTO (classes returned from controllers) must have `@ApiProperty` on all fields.
- Never use plain interfaces as `type` in `@ApiResponse` — create a dedicated DTO class (e.g. `AuthTokensDto`, `UserResponseDto`).
- Request DTOs live in `src/*/dto/*.dto.ts`; response DTOs in `src/auth/dto/*-response.dto.ts`.

### main.ts Swagger setup
- Swagger is mounted at `GET /api/docs` (JSON spec at `GET /api/docs-json`).
- The `addBearerAuth` key is `'access-token'` — always match this name in `@ApiBearerAuth('access-token')`.
- Do not move Swagger setup inline in `bootstrap()` — keep it in the `setupSwagger(app)` helper.

---

## Testing checklist

For every new service:
- [ ] Unit test with all dependencies mocked
- [ ] Tests for happy path AND error cases (not just `should be defined`)

For every new guard:
- [ ] Use `buildContext()` helper to construct `ExecutionContext`
- [ ] Test missing fields → `UnauthorizedException`
- [ ] Test invalid token → `UnauthorizedException`
- [ ] Test valid flow → `canActivate` returns `true` and `req.user` is populated

For controller tests:
- Always use `.overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })` to avoid injecting guard dependencies in unit tests.

For e2e tests:
- Reset the database with `dataSource.synchronize(true)` in `beforeAll`.
- Test token rotation: old refresh token must be rejected after use.
- Test post-logout: refresh token must be rejected, access token remains valid (stateless).
