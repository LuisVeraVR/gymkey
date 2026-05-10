import { Test, TestingModule } from '@nestjs/testing';
import { AccessKeysService } from './access-keys.service';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

const mockJwtService = {
  sign: jest.fn().mockReturnValue('signed-token'),
  verifyAsync: jest.fn(),
};

const mockUsersService = {
  findById: jest.fn(),
};

const mockPrisma = {
  checkin: { create: jest.fn() },
};

const mockNotifications = {
  sendToTenant: jest.fn(),
};

const mockAuditLogs = {
  append: jest.fn(),
};

describe('AccessKeysService', () => {
  let service: AccessKeysService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccessKeysService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsGateway, useValue: mockNotifications },
        { provide: AuditLogsService, useValue: mockAuditLogs },
      ],
    }).compile();

    service = module.get<AccessKeysService>(AccessKeysService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateKey — GRANTED', () => {
    it('creates a GRANTED checkin when user is active with ACTIVE subscription', async () => {
      const tenantId = 'tenant-1';
      const userId = 'user-1';

      mockJwtService.verifyAsync.mockResolvedValue({
        type: 'access_key',
        tenantId,
        sub: userId,
      });

      mockUsersService.findById.mockResolvedValue({
        id: userId,
        name: 'Luis',
        email: 'luis@test.com',
        photo: null,
        isActive: true,
        role: 'MEMBER',
        subscription: { status: 'ACTIVE' },
      });

      const checkinRecord = {
        id: 'checkin-1',
        userId,
        tenantId,
        status: 'GRANTED',
        method: 'QR',
        details: null,
      };
      mockPrisma.checkin.create.mockResolvedValue(checkinRecord);
      mockAuditLogs.append.mockResolvedValue(undefined);

      const result = await service.validateKey('some-token', tenantId);

      expect(result.valid).toBe(true);
      expect(mockPrisma.checkin.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          tenantId,
          status: 'GRANTED',
          method: 'QR',
        }),
      });
      expect(mockNotifications.sendToTenant).toHaveBeenCalledWith(
        tenantId,
        'checkin_created',
        expect.objectContaining({ id: 'checkin-1' }),
      );
      expect(mockAuditLogs.append).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'access_granted' }),
      );
    });
  });

  describe('validateKey — DENIED', () => {
    it('creates a DENIED checkin when user is inactive', async () => {
      const tenantId = 'tenant-1';
      const userId = 'user-2';

      mockJwtService.verifyAsync.mockResolvedValue({
        type: 'access_key',
        tenantId,
        sub: userId,
      });

      mockUsersService.findById.mockResolvedValue({
        id: userId,
        name: 'Inactive User',
        email: 'inactive@test.com',
        photo: null,
        isActive: false,
        role: 'MEMBER',
        subscription: null,
      });

      const checkinRecord = {
        id: 'checkin-2',
        userId,
        tenantId,
        status: 'DENIED',
        method: 'QR',
        details: 'Usuario INACTIVO o SUSPENDIDO',
      };
      mockPrisma.checkin.create.mockResolvedValue(checkinRecord);
      mockAuditLogs.append.mockResolvedValue(undefined);

      const result = await service.validateKey('some-token', tenantId);

      expect(result.valid).toBe(false);
      expect((result as any).reason).toBe('Usuario INACTIVO o SUSPENDIDO');
      expect(mockPrisma.checkin.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'DENIED',
          details: 'Usuario INACTIVO o SUSPENDIDO',
        }),
      });
      expect(mockAuditLogs.append).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'access_denied' }),
      );
    });

    it('creates a DENIED checkin when member has no subscription', async () => {
      const tenantId = 'tenant-1';
      const userId = 'user-3';

      mockJwtService.verifyAsync.mockResolvedValue({
        type: 'access_key',
        tenantId,
        sub: userId,
      });

      mockUsersService.findById.mockResolvedValue({
        id: userId,
        name: 'No Sub User',
        email: 'nosub@test.com',
        photo: null,
        isActive: true,
        role: 'MEMBER',
        subscription: null,
      });

      const checkinRecord = {
        id: 'checkin-3',
        userId,
        tenantId,
        status: 'DENIED',
        method: 'QR',
        details: 'Sin Membresía',
      };
      mockPrisma.checkin.create.mockResolvedValue(checkinRecord);
      mockAuditLogs.append.mockResolvedValue(undefined);

      const result = await service.validateKey('some-token', tenantId);

      expect(result.valid).toBe(false);
      expect((result as any).reason).toBe('Sin Membresía');
    });
  });
});
