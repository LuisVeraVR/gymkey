import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformService } from '../platform/platform.service';

@Injectable()
export class PublicService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly platformService: PlatformService,
  ) {}

  private combineDayAndTime(date: Date, hhmm: string) {
    const [h, m] = hhmm.split(':').map((n) => Number(n));
    const result = new Date(date);
    result.setHours(h || 0, m || 0, 0, 0);
    return result;
  }

  private nextOccurrence(dayOfWeek: number[], startTime: string) {
    const now = new Date();
    for (let i = 0; i < 21; i += 1) {
      const candidate = new Date(now);
      candidate.setDate(candidate.getDate() + i);
      if (!dayOfWeek.includes(candidate.getDay())) continue;
      const withTime = this.combineDayAndTime(candidate, startTime);
      if (withTime > now) return withTime;
    }
    return null;
  }

  async getGymPublicData(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        config: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException('Gimnasio no encontrado');
    }

    const publicPortalEnabled = await this.platformService.isFeatureEnabled(
      tenant.id,
      'publicPortal',
    );
    if (!publicPortalEnabled) {
      throw new NotFoundException('Portal público no disponible en el plan actual');
    }

    const config = (tenant.config ?? {}) as Record<string, unknown>;
    const showPublicPortal =
      typeof config.showPublicPortal === 'boolean'
        ? config.showPublicPortal
        : Boolean(config.allowPublicRegistration);
    if (!showPublicPortal) {
      throw new NotFoundException('Portal público deshabilitado');
    }

    const [plans, classes] = await Promise.all([
      this.prisma.plan.findMany({
        where: { tenantId: tenant.id, active: true },
        orderBy: { price: 'asc' },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          duration: true,
          features: true,
        },
      }),
      this.prisma.gymClass.findMany({
        where: { tenantId: tenant.id, active: true },
        orderBy: { startTime: 'asc' },
        include: {
          coach: { select: { id: true, name: true } },
        },
      }),
    ]);

    const classesWithAvailability = await Promise.all(
      classes.map(async (row) => {
        const nextDate = this.nextOccurrence(row.dayOfWeek, row.startTime);
        const occupied = nextDate
          ? await this.prisma.classBooking.count({
              where: {
                classId: row.id,
                date: nextDate,
                status: { in: ['CONFIRMED', 'ATTENDED'] },
              },
            })
          : 0;
        return {
          id: row.id,
          name: row.name,
          description: row.description,
          dayOfWeek: row.dayOfWeek,
          startTime: row.startTime,
          duration: row.duration,
          capacity: row.capacity,
          occupied,
          available: Math.max(0, row.capacity - occupied),
          nextDate: nextDate ? nextDate.toISOString() : null,
          coach: row.coach,
        };
      }),
    );

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        config: tenant.config,
      },
      plans: plans.map((p) => ({
        ...p,
        price: Number(p.price),
      })),
      classes: classesWithAvailability,
    };
  }
}
