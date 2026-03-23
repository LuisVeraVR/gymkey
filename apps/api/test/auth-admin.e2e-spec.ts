import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';

const request = require('supertest');
import { AppModule } from './../src/app.module';

describe('Auth System (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/auth/admin/login (POST) - Success', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/admin/login')
      .send({
        email: 'admin@demogym.com',
        password: '123456',
      })
      .expect(201);

    expect(response.body).toHaveProperty('access_token');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user.email).toBe('admin@demogym.com');

    accessToken = response.body.access_token;
  });

  it('/auth/admin/login (POST) - Unauthorized Role', async () => {
    // Assuming member@demogym.com exists and is a MEMBER
    await request(app.getHttpServer())
      .post('/auth/admin/login')
      .send({
        email: 'member@demogym.com',
        password: '123456',
      })
      .expect(401);
  });

  it('/auth/me (GET) - Protected Route', async () => {
    // First login to get token
    const loginRes = await request(app.getHttpServer())
      .post('/auth/admin/login')
      .send({
        email: 'admin@demogym.com',
        password: '123456',
      });

    const token = loginRes.body.access_token;

    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.email).toBe('admin@demogym.com');
  });
});
