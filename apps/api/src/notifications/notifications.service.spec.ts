import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

const mockPrisma = {
  notification: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
};

const mockGateway = {
  server: { emit: jest.fn(), to: jest.fn().mockReturnThis() },
  sendToUser: jest.fn(),
};

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: typeof mockPrisma;
  let gateway: typeof mockGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsGateway, useValue: mockGateway },
      ],
    }).compile();

    service = module.get(NotificationsService);
    prisma = module.get(PrismaService);
    gateway = module.get(NotificationsGateway);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createAndEmit', () => {
    it('creates row and emits to user', async () => {
      const created = {
        id: 'n1',
        title: 'T',
        message: 'M',
        type: 'info',
        read: false,
        userId: 'u1',
        tenantId: 't1',
        metadata: null,
        createdAt: new Date('2026-01-01'),
      };
      prisma.notification.create.mockResolvedValue(created);

      const result = await service.createAndEmit({
        userId: 'u1',
        tenantId: 't1',
        title: 'T',
        message: 'M',
      });

      expect(result).toEqual(created);
      expect(gateway.sendToUser).toHaveBeenCalledWith(
        'u1',
        'notification',
        expect.objectContaining({
          id: 'n1',
          title: 'T',
          read: false,
          createdAt: '2026-01-01T00:00:00.000Z',
        }),
      );
    });
  });

  describe('findForUser', () => {
    it('applies unreadOnly and pagination', async () => {
      prisma.notification.findMany.mockResolvedValue([]);
      prisma.notification.count.mockResolvedValue(0);

      await service.findForUser('u1', {
        page: 2,
        limit: 5,
        unreadOnly: true,
      });

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'u1', read: false },
          skip: 5,
          take: 5,
        }),
      );
    });
  });

  describe('markRead', () => {
    it('throws NotFoundException when missing', async () => {
      prisma.notification.findUnique.mockResolvedValue(null);
      await expect(service.markRead('u1', 'bad')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException for other user', async () => {
      prisma.notification.findUnique.mockResolvedValue({
        id: 'n1',
        userId: 'other',
      });
      await expect(service.markRead('u1', 'n1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('updates when owner matches', async () => {
      prisma.notification.findUnique.mockResolvedValue({
        id: 'n1',
        userId: 'u1',
      });
      prisma.notification.update.mockResolvedValue({
        id: 'n1',
        title: 'T',
        message: 'M',
        type: 'info',
        read: true,
        userId: 'u1',
        tenantId: null,
        metadata: null,
        createdAt: new Date(),
      });

      await service.markRead('u1', 'n1');
      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'n1' },
        data: { read: true },
      });
    });
  });

  describe('markAllRead', () => {
    it('updates many for user', async () => {
      prisma.notification.updateMany.mockResolvedValue({ count: 3 });
      await service.markAllRead('u1');
      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u1', read: false },
        data: { read: true },
      });
    });
  });
});
