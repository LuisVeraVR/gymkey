import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  payment: { findMany: jest.fn() },
  checkin: { findMany: jest.fn() },
  user: { findMany: jest.fn() },
};

describe('ReportsService', () => {
  let service: ReportsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  afterEach(() => jest.clearAllMocks());

  it('generates payments CSV with expected headers', async () => {
    mockPrisma.payment.findMany.mockResolvedValue([
      {
        id: 'p1',
        createdAt: new Date('2026-01-01T10:00:00Z'),
        user: { name: 'Ana', email: 'ana@test.com' },
        amount: '25.5',
        currency: 'USD',
        status: 'COMPLETED',
        method: 'CARD',
        provider: 'STRIPE',
      },
    ]);

    const csv = await service.paymentsCsv('t1');

    expect(csv).toContain('id,date,member_name,member_email,amount,currency,status,method,provider');
    expect(csv).toContain('p1');
    expect(csv).toContain('ana@test.com');
  });

  it('generates checkins CSV and escapes commas', async () => {
    mockPrisma.checkin.findMany.mockResolvedValue([
      {
        id: 'c1',
        timestamp: new Date('2026-01-01T10:00:00Z'),
        user: { name: 'Ana', email: 'ana@test.com' },
        status: 'DENIED',
        method: 'QR',
        details: 'Sin membresía, vencida',
      },
    ]);

    const csv = await service.checkinsCsv('t1');

    expect(csv).toContain('id,timestamp,member_name,member_email,status,method,details');
    expect(csv).toContain('"Sin membresía, vencida"');
  });

  it('generates members CSV including current subscription', async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      {
        id: 'u1',
        createdAt: new Date('2026-01-02T10:00:00Z'),
        name: 'Ana',
        email: 'ana@test.com',
        role: 'MEMBER',
        isActive: true,
        subscriptions: [{ status: 'ACTIVE', plan: { name: 'Premium' } }],
      },
    ]);

    const csv = await service.membersCsv('t1');

    expect(csv).toContain('subscription_status');
    expect(csv).toContain('ACTIVE');
    expect(csv).toContain('Premium');
  });
});
