import { NestFactory } from '@nestjs/core';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  setupSwagger(app);

  await app.listen(process.env.PORT ?? 3000);
}

function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Auth API')
    .setDescription(
      `## Authentication API with JWT + Refresh Tokens

### Authentication flow

1. **Register** — \`POST /auth/register\` — create an account.
2. **Login** — \`POST /auth/login\` — obtain \`accessToken\` (15 min) and \`refreshToken\` (7 days).
3. **Protected routes** — send the \`accessToken\` as \`Authorization: Bearer <token>\`.
4. **Refresh** — \`POST /auth/refresh\` — exchange the refresh token for a new token pair (old token is revoked).
5. **Logout** — \`POST /auth/logout\` — revoke all active refresh tokens for the user.

### Security notes
- Access tokens are **stateless JWTs** — they remain valid until expiry even after logout.
- Refresh tokens are **opaque** and stored hashed in the database — they can be revoked.
- Token rotation is enforced: reusing a consumed refresh token returns \`401\`.`,
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Paste your access token here',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });
}

bootstrap();
