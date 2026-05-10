import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ClassesService } from './classes.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

const mockPrisma = {
  gymClass: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
  },
  user: { findUnique: jest.fn() },
  subscription: { findFirst: jest.fn() },
  classBooking: {
    findFirst: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  $transaction: jest.fn(async (fn: (tx: typeof mockPrisma) => unknown) => fn(mockPrisma)),
};

const mockGateway = { sendToTenant: jest.fn() };
const mockNotificationsService = { createAndEmit: jest.fn() };
const mockAudit = { append: jest.fn() };

describe('ClassesService', () => {
  let service: ClassesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsGateway, useValue: mockGateway },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: AuditLogsService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<ClassesService>(ClassesService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects booking without active subscription', async () => {
    mockPrisma.gymClass.findFirst.mockResolvedValue({
      id: 'c1',
      name: 'Crossfit',
      dayOfWeek: [1],
      startTime: '08:00',
      capacity: 10,
      coach: { name: 'Coach' },
    });
    mockPrisma.subscription.findFirst.mockResolvedValue(null);

    await expect(
      service.bookClass('c1', '2030-01-07', {
        userId: 'u1',
        tenantId: 't1',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects booking when no capacity available', async () => {
    mockPrisma.gymClass.findFirst.mockResolvedValue({
      id: 'c1',
      name: 'Crossfit',
      dayOfWeek: [1],
      startTime: '08:00',
      capacity: 1,
      coach: { name: 'Coach' },
    });
    mockPrisma.subscription.findFirst.mockResolvedValue({ id: 'sub1' });
    mockPrisma.classBooking.findFirst.mockResolvedValue(null);
    mockPrisma.classBooking.count.mockResolvedValue(1);

    await expect(
      service.bookClass('c1', '2030-01-07', {
        userId: 'u1',
        tenantId: 't1',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects cancelation when class starts in less than 2 hours', async () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const startTime = `${hh}:${mm}`;
    mockPrisma.classBooking.findFirst.mockResolvedValue({
      id: 'b1',
      classId: 'c1',
      userId: 'u1',
      tenantId: 't1',
      date: now,
      status: 'CONFIRMED',
      gymClass: { id: 'c1', name: 'Clase', startTime },
    });

    await expect(
      service.cancelBooking('c1', now.toISOString(), {
        userId: 'u1',
        tenantId: 't1',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('updates booking status for staff workflows', async () => {
    mockPrisma.classBooking.findFirst.mockResolvedValue({
      id: 'b1',
      classId: 'c1',
      tenantId: 't1',
      user: { id: 'u1', name: 'Ana' },
      gymClass: { id: 'c1', name: 'Funcional' },
    });
    mockPrisma.classBooking.update.mockResolvedValue({ id: 'b1', status: 'ATTENDED' });

    const result = await service.updateBookingStatus('c1', 'b1', 'ATTENDED', {
      userId: 'staff1',
      tenantId: 't1',
    });

    expect(result).toEqual({ id: 'b1', status: 'ATTENDED' });
    expect(mockAudit.append).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'class_booking_status_updated' }),
    );
  });

  it('throws NotFound when booking status target is missing', async () => {
    mockPrisma.classBooking.findFirst.mockResolvedValue(null);

    await expect(
      service.updateBookingStatus('c1', 'bad', 'NO_SHOW', {
        userId: 'staff1',
        tenantId: 't1',
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
