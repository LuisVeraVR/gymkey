import { Test, TestingModule } from '@nestjs/testing';
import { PlansService } from './plans.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

const mockPrismaService = {
  plan: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const mockNotificationsGateway = {
  sendToTenant: jest.fn(),
};

describe('PlansService', () => {
  let service: PlansService;
  let prisma: typeof mockPrismaService;
  let notifications: typeof mockNotificationsGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlansService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: NotificationsGateway,
          useValue: mockNotificationsGateway,
        },
      ],
    }).compile();

    service = module.get<PlansService>(PlansService);
    prisma = module.get(PrismaService);
    notifications = module.get(NotificationsGateway);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a plan', async () => {
      const dto = {
        name: 'Test Plan',
        price: 100,
        tenant: { connect: { id: 'tenant-1' } },
      };
      const expectedResult = { id: '1', ...dto };

      prisma.plan.create.mockResolvedValue(expectedResult);

      const result = await service.create(dto as any);
      expect(result).toEqual(expectedResult);
      expect(prisma.plan.create).toHaveBeenCalledWith({ data: dto });
      expect(notifications.sendToTenant).toHaveBeenCalledWith(
        'tenant-1',
        'plan_created',
        expectedResult,
      );
    });
  });

  describe('findAll', () => {
    it('should return plans for a specific tenant', async () => {
      const tenantId = 'tenant-1';
      const plans = [{ id: '1', name: 'Plan 1', tenantId }];

      prisma.plan.findMany.mockResolvedValue(plans);

      const result = await service.findAll(tenantId);
      expect(result).toEqual(plans);
      expect(prisma.plan.findMany).toHaveBeenCalledWith({
        where: { tenantId },
        orderBy: { price: 'asc' },
      });
    });
  });

  describe('update', () => {
    it('should update a plan', async () => {
      const id = '1';
      const dto = { name: 'Updated Plan' };
      const expectedResult = { id, ...dto, tenantId: 'tenant-1' };

      prisma.plan.update.mockResolvedValue(expectedResult);

      const result = await service.update(id, dto);
      expect(result).toEqual(expectedResult);
      expect(prisma.plan.update).toHaveBeenCalledWith({
        where: { id },
        data: dto,
      });
      expect(notifications.sendToTenant).toHaveBeenCalledWith(
        'tenant-1',
        'plan_updated',
        expectedResult,
      );
    });
  });

  describe('remove', () => {
    it('should delete a plan', async () => {
      const id = '1';
      const expectedResult = { id, name: 'Deleted Plan', tenantId: 'tenant-1' };

      prisma.plan.delete.mockResolvedValue(expectedResult);

      const result = await service.remove(id);
      expect(result).toEqual(expectedResult);
      expect(prisma.plan.delete).toHaveBeenCalledWith({ where: { id } });
      expect(notifications.sendToTenant).toHaveBeenCalledWith(
        'tenant-1',
        'plan_deleted',
        { id },
      );
    });
  });
});
