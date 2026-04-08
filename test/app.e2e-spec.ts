import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

describe('Authentication Flow (e2e)', () => {
  let app: INestApplication;
  let jwtToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    const dataSource = app.get(DataSource);
    await dataSource.synchronize(true); // Reset DB
  });

  afterAll(async () => {
    await app.close();
  });

  it('/auth/register (POST) - Success', () => {
    return request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'e2e@test.com', password: 'password123' })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('email', 'e2e@test.com');
        expect(res.body).not.toHaveProperty('password');
      });
  });

  it('/auth/register (POST) - Failed due to duplicate email', () => {
    return request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'e2e@test.com', password: 'password123' })
      .expect(409); // Conflict
  });

  it('/auth/login (POST) - Success', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'e2e@test.com', password: 'password123' })
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('access_token');
        jwtToken = res.body.access_token;
      });
  });

  it('/auth/login (POST) - Failed (wrong password)', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'e2e@test.com', password: 'wrongpassword' })
      .expect(401); // Unauthorized
  });

  it('/profile (GET) - Success with JWT', () => {
    return request(app.getHttpServer())
      .get('/profile')
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('email', 'e2e@test.com');
      });
  });

  it('/profile (GET) - Failed (no JWT or invalid)', () => {
    return request(app.getHttpServer())
      .get('/profile')
      .expect(401);
  });
});
