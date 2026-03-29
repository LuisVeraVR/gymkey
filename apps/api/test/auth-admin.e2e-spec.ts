import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';

const request = require('supertest');
import { AppModule } from './../src/app.module';

describe('Auth System (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/auth/admin/login (POST) - Success', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/admin/login')
      .send({
        email: 'admin@demogym.com',
        password: '123456',
      });

    expect([200, 201]).toContain(response.status);

    expect(
      response.body.mfaSetupSuggested === true ||
        response.body.mfaSetupRequired === true ||
        response.body.mfaRequired === true ||
        response.body.passwordChangeRequired === true,
    ).toBe(true);
    expect(response.body.tempToken).toBeDefined();
    expect(response.body.user?.email).toBe('admin@demogym.com');
  });

  it('/auth/admin/login (POST) - Unauthorized Role', async () => {
    await request(app.getHttpServer())
      .post('/auth/admin/login')
      .send({
        email: 'member@demogym.com',
        password: '123456',
      })
      .expect(401);
  });

  it('/auth/me (GET) - Protected Route', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/auth/admin/login')
      .send({
        email: 'admin@demogym.com',
        password: '123456',
      });

    const tempToken = loginRes.body.tempToken;
    expect(tempToken).toBeDefined();

    const skipRes = await request(app.getHttpServer())
      .post('/auth/mfa/skip')
      .set('Authorization', `Bearer ${tempToken}`);

    expect([200, 201]).toContain(skipRes.status);

    const cookies = skipRes.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies;

    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', cookieHeader)
      .expect(200);

    expect(response.body.email).toBe('admin@demogym.com');
    expect(response.body.name).toBeDefined();
  });
});
