import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, SubscriptionStatus } from '@prisma/client';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateGymClassDto } from './dto/create-gym-class.dto';
import { UpdateGymClassDto } from './dto/update-gym-class.dto';

const BOOKING_ACTIVE_STATUSES = ['CONFIRMED', 'ATTENDED'] as const;

type Actor = {
  userId: string;
  tenantId: string | null;
  role?: UserRole;
};

@Injectable()
export class ClassesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsGateway,
    private readonly notificationsService: NotificationsService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  private parseDate(input: string): Date {
    const d = new Date(input);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException('Fecha inválida');
    }
    d.setSeconds(0, 0);
    return d;
  }

  private isDateOnly(input: string) {
    return /^\d{4}-\d{2}-\d{2}$/.test(input);
  }

  private dayRange(dateOnly: string) {
    const start = new Date(`${dateOnly}T00:00:00.000Z`);
    if (Number.isNaN(start.getTime())) {
      throw new BadRequestException('Fecha inválida');
    }
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { gte: start, lt: end };
  }

  private combineDayAndTime(date: Date, hhmm: string): Date {
    const [h, m] = hhmm.split(':').map((n) => Number(n));
    const result = new Date(date);
    result.setHours(h, m, 0, 0);
    return result;
  }

  private nextOccurrence(dayOfWeek: number[], startTime: string, now = new Date()) {
    let best: Date | null = null;
    for (let i = 0; i < 21; i += 1) {
      const candidate = new Date(now);
      candidate.setDate(candidate.getDate() + i);
      if (!dayOfWeek.includes(candidate.getDay())) continue;
      const withTime = this.combineDayAndTime(candidate, startTime);
      if (withTime <= now) continue;
      if (!best || withTime < best) best = withTime;
    }
    return best;
  }

  private ensureTenant(actor: Actor): string {
    if (!actor.tenantId) {
      throw new ForbiddenException('No hay tenant en la sesión');
    }
    return actor.tenantId;
  }

  async create(dto: CreateGymClassDto, actor: Actor) {
    const tenantId = this.ensureTenant(actor);

    const coach = await this.prisma.user.findUnique({
      where: { id: dto.coachId },
      select: { id: true, tenantId: true, role: true, name: true, email: true },
    });
    if (!coach || coach.tenantId !== tenantId || coach.role !== UserRole.COACH) {
      throw new BadRequestException('Coach inválido para este tenant');
    }

    const created = await this.prisma.gymClass.create({
      data: {
        name: dto.name,
        description: dto.description,
        coachId: dto.coachId,
        capacity: dto.capacity,
        duration: dto.duration,
        dayOfWeek: [...new Set(dto.dayOfWeek)].sort((a, b) => a - b),
        startTime: dto.startTime,
        active: dto.active ?? true,
        tenantId,
      },
      include: {
        coach: { select: { id: true, name: true, email: true } },
      },
    });

    this.notifications.sendToTenant(tenantId, 'class_created', created);
    await this.auditLogs.append({
      tenantId,
      userId: actor.userId,
      action: 'class_created',
      details: {
        summary: `Clase creada: ${created.name}`,
        classId: created.id,
      },
    });

    return created;
  }

  async findAll(tenantId: string | null) {
    if (!tenantId) return [];

    const rows = await this.prisma.gymClass.findMany({
      where: { tenantId },
      include: {
        coach: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ active: 'desc' }, { startTime: 'asc' }],
    });

    const now = new Date();
    const enriched = await Promise.all(
      rows.map(async (row) => {
        const nextDate = this.nextOccurrence(row.dayOfWeek, row.startTime, now);
        if (!nextDate) {
          return {
            ...row,
            nextDate: null,
            occupied: 0,
            available: row.capacity,
          };
        }
        const occupied = await this.prisma.classBooking.count({
          where: {
            classId: row.id,
            date: nextDate,
            status: { in: [...BOOKING_ACTIVE_STATUSES] },
          },
        });
        return {
          ...row,
          nextDate: nextDate.toISOString(),
          occupied,
          available: Math.max(0, row.capacity - occupied),
        };
      }),
    );

    return enriched;
  }

  async findOne(id: string, tenantId: string | null) {
    if (!tenantId) throw new ForbiddenException();

    const row = await this.prisma.gymClass.findFirst({
      where: { id, tenantId },
      include: {
        coach: { select: { id: true, name: true, email: true } },
        bookings: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: [{ date: 'asc' }, { createdAt: 'desc' }],
        },
      },
    });

    if (!row) throw new NotFoundException('Clase no encontrada');
    return row;
  }

  async update(id: string, dto: UpdateGymClassDto, actor: Actor) {
    const tenantId = this.ensureTenant(actor);

    const existing = await this.prisma.gymClass.findFirst({
      where: { id, tenantId },
      select: { id: true, name: true },
    });
    if (!existing) throw new NotFoundException('Clase no encontrada');

    if (dto.coachId) {
      const coach = await this.prisma.user.findUnique({
        where: { id: dto.coachId },
        select: { id: true, tenantId: true, role: true },
      });
      if (!coach || coach.tenantId !== tenantId || coach.role !== UserRole.COACH) {
        throw new BadRequestException('Coach inválido para este tenant');
      }
    }

    const updated = await this.prisma.gymClass.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.coachId !== undefined ? { coachId: dto.coachId } : {}),
        ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
        ...(dto.duration !== undefined ? { duration: dto.duration } : {}),
        ...(dto.dayOfWeek !== undefined
          ? { dayOfWeek: [...new Set(dto.dayOfWeek)].sort((a, b) => a - b) }
          : {}),
        ...(dto.startTime !== undefined ? { startTime: dto.startTime } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
      include: {
        coach: { select: { id: true, name: true, email: true } },
      },
    });

    this.notifications.sendToTenant(tenantId, 'class_updated', updated);
    await this.auditLogs.append({
      tenantId,
      userId: actor.userId,
      action: 'class_updated',
      details: {
        summary: `Clase actualizada: ${updated.name}`,
        classId: updated.id,
      },
    });

    return updated;
  }

  async remove(id: string, actor: Actor) {
    const tenantId = this.ensureTenant(actor);

    const existing = await this.prisma.gymClass.findFirst({
      where: { id, tenantId },
      select: { id: true, name: true },
    });
    if (!existing) throw new NotFoundException('Clase no encontrada');

    await this.prisma.gymClass.delete({ where: { id } });

    this.notifications.sendToTenant(tenantId, 'class_deleted', { id });
    await this.auditLogs.append({
      tenantId,
      userId: actor.userId,
      action: 'class_deleted',
      details: {
        summary: `Clase eliminada: ${existing.name}`,
        classId: id,
      },
    });

    return { ok: true };
  }

  async bookClass(classId: string, dateInput: string, actor: Actor) {
    const tenantId = this.ensureTenant(actor);

    const gymClass = await this.prisma.gymClass.findFirst({
      where: { id: classId, tenantId, active: true },
      include: {
        coach: { select: { name: true } },
      },
    });
    if (!gymClass) throw new NotFoundException('Clase no encontrada');

    const date = this.isDateOnly(dateInput)
      ? this.combineDayAndTime(this.parseDate(dateInput), gymClass.startTime)
      : this.parseDate(dateInput);

    if (!gymClass.dayOfWeek.includes(date.getDay())) {
      throw new BadRequestException('La fecha no corresponde a los días de la clase');
    }
    if (date.getTime() <= Date.now()) {
      throw new BadRequestException('La reserva debe ser para una fecha futura');
    }

    const memberSub = await this.prisma.subscription.findFirst({
      where: {
        userId: actor.userId,
        isCurrent: true,
        status: SubscriptionStatus.ACTIVE,
        endDate: { gte: new Date() },
      },
      select: { id: true },
    });
    if (!memberSub) {
      throw new BadRequestException('Necesitas una suscripción activa para reservar');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.classBooking.findFirst({
        where: { classId, userId: actor.userId, date },
      });

      const occupied = await tx.classBooking.count({
        where: {
          classId,
          date,
          status: { in: [...BOOKING_ACTIVE_STATUSES] },
        },
      });

      if (occupied >= gymClass.capacity && (!existing || existing.status === 'CANCELED')) {
        throw new BadRequestException('No hay cupos disponibles para esta clase');
      }

      if (existing && existing.status !== 'CANCELED') {
        throw new BadRequestException('Ya tienes una reserva para esta clase y fecha');
      }

      if (existing && existing.status === 'CANCELED') {
        return tx.classBooking.update({
          where: { id: existing.id },
          data: { status: 'CONFIRMED' },
          include: {
            user: { select: { id: true, name: true, email: true } },
            gymClass: { select: { id: true, name: true, startTime: true } },
          },
        });
      }

      return tx.classBooking.create({
        data: {
          classId,
          userId: actor.userId,
          date,
          status: 'CONFIRMED',
          tenantId,
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          gymClass: { select: { id: true, name: true, startTime: true } },
        },
      });
    });

    this.notifications.sendToTenant(tenantId, 'class_booking_created', result);
    await this.notificationsService.createAndEmit({
      userId: actor.userId,
      tenantId,
      title: 'Reserva confirmada',
      message: `Tu reserva para ${gymClass.name} fue confirmada`,
      type: 'success',
      metadata: { classId, bookingId: result.id, date: result.date.toISOString() },
    });

    await this.auditLogs.append({
      tenantId,
      userId: actor.userId,
      action: 'class_booking_created',
      details: {
        summary: `Reserva creada en ${gymClass.name}`,
        classId,
        bookingId: result.id,
        date: result.date.toISOString(),
      },
    });

    return result;
  }

  async cancelBooking(classId: string, dateInput: string, actor: Actor) {
    const tenantId = this.ensureTenant(actor);
    const raw = decodeURIComponent(dateInput);

    const booking = await this.prisma.classBooking.findFirst({
      where: this.isDateOnly(raw)
        ? {
            classId,
            userId: actor.userId,
            tenantId,
            date: this.dayRange(raw),
          }
        : { classId, userId: actor.userId, date: this.parseDate(raw), tenantId },
      include: {
        gymClass: { select: { id: true, name: true, startTime: true } },
      },
    });
    if (!booking) throw new NotFoundException('Reserva no encontrada');

    const classStartAt = this.combineDayAndTime(booking.date, booking.gymClass.startTime);
    const msToClass = classStartAt.getTime() - Date.now();
    if (msToClass <= 2 * 60 * 60 * 1000) {
      throw new BadRequestException('Solo puedes cancelar con más de 2 horas de anticipación');
    }

    if (booking.status === 'CANCELED') {
      return booking;
    }

    const updated = await this.prisma.classBooking.update({
      where: { id: booking.id },
      data: { status: 'CANCELED' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        gymClass: { select: { id: true, name: true, startTime: true } },
      },
    });

    this.notifications.sendToTenant(tenantId, 'class_booking_canceled', updated);

    await this.auditLogs.append({
      tenantId,
      userId: actor.userId,
      action: 'class_booking_canceled',
      details: {
        summary: `Reserva cancelada en ${booking.gymClass.name}`,
        classId,
        bookingId: booking.id,
      },
    });

    return updated;
  }

  async findMyBookings(actor: Actor) {
    const tenantId = this.ensureTenant(actor);

    return this.prisma.classBooking.findMany({
      where: {
        tenantId,
        userId: actor.userId,
        date: { gte: new Date() },
        status: { not: 'CANCELED' },
      },
      include: {
        gymClass: {
          include: {
            coach: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: [{ date: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async listBookingsForClass(classId: string, dateInput: string, actor: Actor) {
    const tenantId = this.ensureTenant(actor);
    const raw = decodeURIComponent(dateInput);
    const whereDate = this.isDateOnly(raw)
      ? this.dayRange(raw)
      : this.parseDate(raw);

    const gymClass = await this.prisma.gymClass.findFirst({
      where: { id: classId, tenantId },
      select: { id: true },
    });
    if (!gymClass) throw new NotFoundException('Clase no encontrada');

    return this.prisma.classBooking.findMany({
      where: { classId, tenantId, date: whereDate },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateBookingStatus(
    classId: string,
    bookingId: string,
    status: 'ATTENDED' | 'NO_SHOW',
    actor: Actor,
  ) {
    const tenantId = this.ensureTenant(actor);

    const booking = await this.prisma.classBooking.findFirst({
      where: {
        id: bookingId,
        classId,
        tenantId,
      },
      include: {
        user: { select: { id: true, name: true } },
        gymClass: { select: { id: true, name: true } },
      },
    });

    if (!booking) throw new NotFoundException('Reserva no encontrada');

    const updated = await this.prisma.classBooking.update({
      where: { id: booking.id },
      data: { status },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    await this.auditLogs.append({
      tenantId,
      userId: actor.userId,
      action: 'class_booking_status_updated',
      details: {
        summary: `Reserva de ${booking.user.name || 'usuario'} marcada como ${status}`,
        classId,
        bookingId,
      },
    });

    return updated;
  }
}
