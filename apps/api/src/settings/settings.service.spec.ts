import { Test, TestingModule } from '@nestjs/testing';
import { SettingsService } from './settings.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

describe('SettingsService', () => {
  let service: SettingsService;
  let prisma: PrismaService;
  let notifications: NotificationsGateway;

  const mockPrismaService = {
    tenant: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockNotificationsGateway = {
    sendToTenant: jest.fn(),
  };

  const mockAuditLogsService = {
    append: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsGateway, useValue: mockNotificationsGateway },
        { provide: AuditLogsService, useValue: mockAuditLogsService },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
    prisma = module.get<PrismaService>(PrismaService);
    notifications = module.get<NotificationsGateway>(NotificationsGateway);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateSettings', () => {
    it('should update settings and emit notification', async () => {
      const tenantId = 'tenant-123';
      const dto = {
        name: 'New Name',
        config: { currency: 'USD' },
      };

      const updatedTenant = {
        id: tenantId,
        name: dto.name,
        config: dto.config,
        slug: 'slug',
      };

      mockPrismaService.tenant.findUnique.mockResolvedValue({
        name: 'Old',
        config: { currency: 'EUR' },
      });
      mockPrismaService.tenant.update.mockResolvedValue(updatedTenant);

      const result = await service.updateSettings(tenantId, dto, 'user-1');

      expect(prisma.tenant.update).toHaveBeenCalledWith({
        where: { id: tenantId },
        data: {
          name: dto.name,
          config: dto.config,
        },
      });

      expect(notifications.sendToTenant).toHaveBeenCalledWith(
        tenantId,
        'settings_updated',
        {
          name: updatedTenant.name,
          config: updatedTenant.config,
          slug: updatedTenant.slug,
        },
      );

      expect(result).toEqual(updatedTenant);
    });
  });
});
