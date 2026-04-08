import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

describe('Authentication Flow (e2e)', () => {
  let app: INestApplication;

  let accessToken: string;
  let refreshToken: string;
  let userId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    const dataSource = app.get(DataSource);
    await dataSource.synchronize(true);
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── Register ──────────────────────────────────────────────────────────────

  describe('POST /auth/register', () => {
    it('should create a user and return it without the password', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'e2e@test.com', password: 'password123' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('email', 'e2e@test.com');
      expect(res.body).not.toHaveProperty('password');
      userId = res.body.id as number;
    });

    it('should return 409 on duplicate email', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'e2e@test.com', password: 'password123' })
        .expect(409);
    });

    it('should return 400 on invalid email format', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'not-an-email', password: 'password123' })
        .expect(400);
    });

    it('should return 400 when password is too short', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'short@test.com', password: '123' })
        .expect(400);
    });
  });

  // ─── Login ─────────────────────────────────────────────────────────────────

  describe('POST /auth/login', () => {
    it('should return accessToken and refreshToken on valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'e2e@test.com', password: 'password123' })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      accessToken = res.body.accessToken as string;
      refreshToken = res.body.refreshToken as string;
    });

    it('should return 401 on wrong password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'e2e@test.com', password: 'wrongpassword' })
        .expect(401);
    });

    it('should return 401 on unknown email', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'ghost@test.com', password: 'password123' })
        .expect(401);
    });
  });

  // ─── Profile ───────────────────────────────────────────────────────────────

  describe('GET /profile', () => {
    it('should return the current user when a valid JWT is provided', async () => {
      const res = await request(app.getHttpServer())
        .get('/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('email', 'e2e@test.com');
      expect(res.body).toHaveProperty('userId');
    });

    it('should return 401 when no JWT is provided', () => {
      return request(app.getHttpServer()).get('/profile').expect(401);
    });

    it('should return 401 when JWT is malformed', () => {
      return request(app.getHttpServer())
        .get('/profile')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
    });
  });

  // ─── Refresh ───────────────────────────────────────────────────────────────

  describe('POST /auth/refresh', () => {
    it('should return new accessToken and refreshToken (token rotation)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken, userId })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.accessToken).not.toBe(accessToken);
      expect(res.body.refreshToken).not.toBe(refreshToken);

      accessToken = res.body.accessToken as string;
      refreshToken = res.body.refreshToken as string;
    });

    it('should return 401 when the same refresh token is reused (token rotation)', async () => {
      const oldRefreshToken = refreshToken;

      const refreshRes = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: oldRefreshToken, userId })
        .expect(200);

      refreshToken = refreshRes.body.refreshToken as string;
      accessToken = refreshRes.body.accessToken as string;

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: oldRefreshToken, userId })
        .expect(401);
    });

    it('should return 401 when refreshToken is invalid', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'totally-fake-token', userId })
        .expect(401);
    });

    it('should return 401 when body is missing required fields (guard runs before pipes)', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({})
        .expect(401);
    });
  });

  // ─── Logout ────────────────────────────────────────────────────────────────

  describe('POST /auth/logout', () => {
    it('should return 401 when no JWT is provided', () => {
      return request(app.getHttpServer()).post('/auth/logout').expect(401);
    });

    it('should revoke all tokens and return 204', () => {
      return request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);
    });

    it('should reject the refresh token after logout', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken, userId })
        .expect(401);
    });

    it('should still accept the access token until it expires (stateless JWT)', async () => {
      const res = await request(app.getHttpServer())
        .get('/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('email', 'e2e@test.com');
    });
  });
});
