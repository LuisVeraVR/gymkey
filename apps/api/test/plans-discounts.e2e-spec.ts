import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';

// Mock otplib before importing AppModule
jest.mock('otplib', () => ({
  authenticator: {
    generate: jest.fn(),
    check: jest.fn(),
  },
  totp: {
    generate: jest.fn(),
    check: jest.fn(),
  },
  generateSecret: jest.fn(),
  generateURI: jest.fn(),
  verify: jest.fn(),
}));

import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { JwtAuthGuard } from './../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from './../src/auth/roles.guard';

describe('Plans and Discounts (e2e)', () => {
  let app: INestApplication;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let prismaService: { plan: any; discount: any };

  const mockPrismaService = {
    plan: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    discount: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockUser = {
    userId: 'user-1',
    username: 'test@gym.com',
    role: 'GYM_ADMIN',
    tenantId: 'tenant-A',
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          req.user = mockUser;
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prismaService = moduleFixture.get<PrismaService>(PrismaService) as any;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/plans', () => {
    it('GET /plans should return plans for the authenticated tenant', async () => {
      const plans = [{ id: '1', name: 'Plan A', tenantId: 'tenant-A' }];
      mockPrismaService.plan.findMany.mockResolvedValue(plans);

      return request(app.getHttpServer())
        .get('/plans')
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual(plans);
          expect(mockPrismaService.plan.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
              where: { tenantId: 'tenant-A' },
            }),
          );
        });
    });

    it('POST /plans should create a plan associated with the tenant', async () => {
      const newPlan = { name: 'New Plan', price: 50, type: 'Mensual' };
      const createdPlan = { id: '2', ...newPlan, tenantId: 'tenant-A' };

      mockPrismaService.plan.create.mockResolvedValue(createdPlan);

      return request(app.getHttpServer())
        .post('/plans')
        .send(newPlan)
        .expect(201)
        .expect((res) => {
          expect(res.body).toEqual(createdPlan);
          expect(mockPrismaService.plan.create).toHaveBeenCalledWith(
            expect.objectContaining({
              data: expect.objectContaining({
                tenant: { connect: { id: 'tenant-A' } },
              }),
            }),
          );
        });
    });
  });

  describe('/discounts', () => {
    it('GET /discounts should return discounts for the authenticated tenant', async () => {
      const discounts = [{ id: '1', name: 'Discount A', tenantId: 'tenant-A' }];
      mockPrismaService.discount.findMany.mockResolvedValue(discounts);

      return request(app.getHttpServer())
        .get('/discounts')
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual(discounts);
          expect(mockPrismaService.discount.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
              where: { tenantId: 'tenant-A' },
            }),
          );
        });
    });
  });
});
