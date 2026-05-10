import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

const mockSubscriptions = {
  subscribe: jest.fn(),
};

const mockAudit = {
  append: jest.fn(),
};

const mockNotifications = {
  createAndEmit: jest.fn(),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SubscriptionsService, useValue: mockSubscriptions },
        { provide: AuditLogsService, useValue: mockAudit },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => jest.clearAllMocks());

  it('creates invited member with temporary password and plan', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({ id: 'u1' });

    const result = await service.inviteMember({
      tenantId: 't1',
      actorId: 'admin1',
      actorName: 'Admin',
      memberName: 'Ana',
      email: 'ana@test.com',
      planId: 'p1',
      temporaryPassword: 'Temp1234',
    });

    expect(result).toEqual({ userId: 'u1', temporaryPassword: 'Temp1234' });
    expect(mockSubscriptions.subscribe).toHaveBeenCalledWith('u1', 'p1');
    expect(mockAudit.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'member_invited' }),
    );
    expect(mockNotifications.createAndEmit).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'admin1' }),
    );
  });
});
