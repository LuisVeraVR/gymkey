import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  $queryRaw: jest.fn(),
  subscription: { count: jest.fn() },
  checkin: { count: jest.fn() },
  auditLog: { count: jest.fn() },
};

describe('DashboardService', () => {
  let service: DashboardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  afterEach(() => jest.clearAllMocks());

  it('builds occupancy heatmap with normalized intensity', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([
      { dow: 1, hour: 8, count: 2 },
      { dow: 1, hour: 9, count: 6 },
    ]);

    const result = await service.getOccupancyHeatmap('t1', 3);

    expect(result.maxCount).toBe(6);
    const target = result.cells.find((c) => c.dow === 1 && c.hour === 9);
    expect(target?.count).toBe(6);
    expect(target?.intensity).toBe(1);
    expect(result.cells).toHaveLength(7 * 16);
  });

  it('computes monthly retention rate and churn', async () => {
    mockPrisma.subscription.count
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(6);

    const result = await service.getRetention('t1', 2);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(
      expect.objectContaining({ totalStart: 10, retained: 8, rate: 80, churn: 20 }),
    );
    expect(result[1]).toEqual(
      expect.objectContaining({ totalStart: 12, retained: 6, rate: 50, churn: 50 }),
    );
  });

  it('returns sidebar indicators for access and recent audit', async () => {
    mockPrisma.checkin.count.mockResolvedValue(18);
    mockPrisma.auditLog.count.mockResolvedValue(4);

    const result = await service.getSidebarIndicators('t1');

    expect(result).toEqual({ accessTodayCount: 18, recentAuditCount: 4 });
    expect(mockPrisma.checkin.count).toHaveBeenCalled();
    expect(mockPrisma.auditLog.count).toHaveBeenCalled();
  });
});
