import { Test, TestingModule } from '@nestjs/testing';
import { DiscountsService } from './discounts.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

const mockPrismaService = {
  discount: {
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

const mockAuditLogsService = {
  append: jest.fn(),
};

describe('DiscountsService', () => {
  let service: DiscountsService;
  let prisma: typeof mockPrismaService;
  let notifications: typeof mockNotificationsGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscountsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: NotificationsGateway,
          useValue: mockNotificationsGateway,
        },
        {
          provide: AuditLogsService,
          useValue: mockAuditLogsService,
        },
      ],
    }).compile();

    service = module.get<DiscountsService>(DiscountsService);
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
    it('should create a discount', async () => {
      const dto = {
        name: 'Test Discount',
        value: 10,
        tenant: { connect: { id: 'tenant-1' } },
      };
      const expectedResult = { id: '1', code: 'SAVE10', ...dto };

      prisma.discount.create.mockResolvedValue(expectedResult);

      const result = await service.create(dto as any);
      expect(result).toEqual(expectedResult);
      expect(prisma.discount.create).toHaveBeenCalledWith({
        data: dto,
        include: { plans: true },
      });
      expect(notifications.sendToTenant).toHaveBeenCalledWith(
        'tenant-1',
        'discount_created',
        expectedResult,
      );
    });
  });

  describe('findAll', () => {
    it('should return discounts for a specific tenant', async () => {
      const tenantId = 'tenant-1';
      const discounts = [{ id: '1', name: 'Discount 1', tenantId }];

      prisma.discount.findMany.mockResolvedValue(discounts);

      const result = await service.findAll(tenantId);
      expect(result).toEqual(discounts);
      expect(prisma.discount.findMany).toHaveBeenCalledWith({
        where: { tenantId },
        include: { plans: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('update', () => {
    it('should update a discount', async () => {
      const id = '1';
      const dto = { name: 'Updated Discount' };
      const expectedResult = {
        id,
        code: 'SAVE10',
        ...dto,
        tenantId: 'tenant-1',
      };

      prisma.discount.update.mockResolvedValue(expectedResult);

      const result = await service.update(id, dto);
      expect(result).toEqual(expectedResult);
      expect(prisma.discount.update).toHaveBeenCalledWith({
        where: { id },
        data: dto,
        include: { plans: true },
      });
      expect(notifications.sendToTenant).toHaveBeenCalledWith(
        'tenant-1',
        'discount_updated',
        expectedResult,
      );
    });
  });

  describe('remove', () => {
    it('should delete a discount', async () => {
      const id = '1';
      const expectedResult = {
        id,
        name: 'Deleted Discount',
        code: 'DEL',
        tenantId: 'tenant-1',
      };

      prisma.discount.delete.mockResolvedValue(expectedResult);

      const result = await service.remove(id);
      expect(result).toEqual(expectedResult);
      expect(prisma.discount.delete).toHaveBeenCalledWith({ where: { id } });
      expect(notifications.sendToTenant).toHaveBeenCalledWith(
        'tenant-1',
        'discount_deleted',
        { id },
      );
    });
  });
});
