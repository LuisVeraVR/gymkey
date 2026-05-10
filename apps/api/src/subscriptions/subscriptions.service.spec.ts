import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionsService } from './subscriptions.service';
import { PrismaService } from '../prisma/prisma.service';
import { PlansService } from '../plans/plans.service';
import { BadRequestException } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

const mockPrisma = {
  subscription: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const mockPlansService = {
  findOne: jest.fn(),
};

const mockNotificationsService = {
  createAndEmit: jest.fn(),
};

const mockAuditLogsService = {
  append: jest.fn(),
};

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PlansService, useValue: mockPlansService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: AuditLogsService, useValue: mockAuditLogsService },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('subscribe', () => {
    const plan = { id: 'plan-1', name: 'Mensual', duration: 30 };

    it('creates a new subscription when none exists', async () => {
      mockPlansService.findOne.mockResolvedValue(plan);
      mockPrisma.subscription.findFirst.mockResolvedValue(null);
      mockPrisma.subscription.create.mockResolvedValue({
        id: 'sub-1',
        userId: 'user-1',
        planId: 'plan-1',
        status: 'ACTIVE',
        isCurrent: true,
      });

      const result = await service.subscribe('user-1', 'plan-1');

      expect(result.isCurrent).toBe(true);
      expect(result.status).toBe('ACTIVE');
      expect(mockPrisma.subscription.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          planId: 'plan-1',
          isCurrent: true,
          status: 'ACTIVE',
        }),
      });
    });

    it('rejects if user already has an ACTIVE subscription', async () => {
      mockPlansService.findOne.mockResolvedValue(plan);
      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: 'sub-old',
        userId: 'user-1',
        status: 'ACTIVE',
        isCurrent: true,
      });

      await expect(service.subscribe('user-1', 'plan-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('marks previous non-active subscription as isCurrent=false before creating new one', async () => {
      mockPlansService.findOne.mockResolvedValue(plan);
      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: 'sub-old',
        userId: 'user-1',
        status: 'EXPIRED',
        isCurrent: true,
      });
      mockPrisma.subscription.update.mockResolvedValue({
        id: 'sub-old',
        isCurrent: false,
      });
      mockPrisma.subscription.create.mockResolvedValue({
        id: 'sub-new',
        userId: 'user-1',
        planId: 'plan-1',
        status: 'ACTIVE',
        isCurrent: true,
      });

      const result = await service.subscribe('user-1', 'plan-1');

      expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
        where: { id: 'sub-old' },
        data: { isCurrent: false },
      });
      expect(result.id).toBe('sub-new');
      expect(result.isCurrent).toBe(true);
    });
  });

  describe('findByUser', () => {
    it('returns the current subscription', async () => {
      const sub = { id: 'sub-1', isCurrent: true, plan: { name: 'Premium' } };
      mockPrisma.subscription.findFirst.mockResolvedValue(sub);

      const result = await service.findByUser('user-1');

      expect(result).toEqual(sub);
      expect(mockPrisma.subscription.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user-1', isCurrent: true },
        include: { plan: true },
      });
    });
  });

  describe('findHistoryByUser', () => {
    it('returns all subscriptions ordered by date', async () => {
      const history = [
        { id: 'sub-2', isCurrent: true },
        { id: 'sub-1', isCurrent: false },
      ];
      mockPrisma.subscription.findMany.mockResolvedValue(history);

      const result = await service.findHistoryByUser('user-1');

      expect(result).toHaveLength(2);
      expect(mockPrisma.subscription.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        include: { plan: true },
      });
    });
  });

  describe('processMembershipExpirationsAndAlerts', () => {
    it('alerts soon-to-expire and marks expired subscriptions', async () => {
      mockPrisma.subscription.findMany
        .mockResolvedValueOnce([
          {
            id: 'sub-soon',
            userId: 'u1',
            endDate: new Date('2030-01-05T00:00:00Z'),
            user: { tenantId: 't1', name: 'Ana', email: 'ana@test.com' },
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'sub-expired',
            userId: 'u2',
            endDate: new Date('2020-01-01T00:00:00Z'),
            user: { tenantId: 't1', name: 'Luis', email: 'luis@test.com' },
          },
        ]);
      mockPrisma.subscription.update.mockResolvedValue({
        id: 'sub-expired',
        status: 'EXPIRED',
      });

      const result = await service.processMembershipExpirationsAndAlerts();

      expect(result).toEqual({ expiringSoon: 1, expired: 1 });
      expect(mockNotificationsService.createAndEmit).toHaveBeenCalledTimes(2);
      expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
        where: { id: 'sub-expired' },
        data: { status: 'EXPIRED' },
      });
      expect(mockAuditLogsService.append).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'subscription_auto_expired' }),
      );
    });
  });
});
