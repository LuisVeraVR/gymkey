import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlansService } from '../plans/plans.service';
import { SubscriptionStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class SubscriptionsService {
  constructor(
    private prisma: PrismaService,
    private plansService: PlansService,
    private notifications: NotificationsService,
    private auditLogs: AuditLogsService,
  ) {}

  /** Cambia el plan de la suscripción actual o crea una nueva si no hay. */
  async updateActivePlan(userId: string, planId: string) {
    const plan = await this.plansService.findOne(planId);
    const current = await this.prisma.subscription.findFirst({
      where: { userId, isCurrent: true },
    });
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + plan.duration);

    if (!current) {
      return this.prisma.subscription.create({
        data: {
          userId,
          planId,
          status: SubscriptionStatus.ACTIVE,
          isCurrent: true,
          startDate,
          endDate,
        },
      });
    }

    return this.prisma.subscription.update({
      where: { id: current.id },
      data: {
        planId,
        endDate,
        status: SubscriptionStatus.ACTIVE,
      },
    });
  }

  /** Quita la suscripción marcada como actual (miembro sin plan en el admin). */
  async clearCurrentPlan(userId: string) {
    const current = await this.prisma.subscription.findFirst({
      where: { userId, isCurrent: true },
    });
    if (!current) return null;
    return this.prisma.subscription.update({
      where: { id: current.id },
      data: { isCurrent: false, status: SubscriptionStatus.CANCELED },
    });
  }

  async subscribe(userId: string, planId: string) {
    const plan = await this.plansService.findOne(planId);

    const current = await this.prisma.subscription.findFirst({
      where: { userId, isCurrent: true },
    });

    if (current && current.status === SubscriptionStatus.ACTIVE) {
      throw new BadRequestException(
        'El usuario ya tiene una suscripción activa',
      );
    }

    if (current) {
      await this.prisma.subscription.update({
        where: { id: current.id },
        data: { isCurrent: false },
      });
    }

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + plan.duration);

    return this.prisma.subscription.create({
      data: {
        userId,
        planId,
        status: SubscriptionStatus.ACTIVE,
        isCurrent: true,
        startDate,
        endDate,
      },
    });
  }

  async findByUser(userId: string) {
    return this.prisma.subscription.findFirst({
      where: { userId, isCurrent: true },
      include: { plan: true },
    });
  }

  async findHistoryByUser(userId: string) {
    return this.prisma.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { plan: true },
    });
  }

  findAllByTenant(tenantId: string | null) {
    if (!tenantId) {
      return [];
    }
    return this.prisma.subscription.findMany({
      where: { user: { tenantId }, isCurrent: true },
      include: { user: { select: { id: true, name: true, email: true } }, plan: true },
      orderBy: { endDate: 'desc' },
    });
  }

  async cancel(userId: string) {
    const current = await this.prisma.subscription.findFirst({
      where: { userId, isCurrent: true },
    });
    if (!current) {
      throw new NotFoundException('No hay suscripción activa para cancelar');
    }
    return this.prisma.subscription.update({
      where: { id: current.id },
      data: { status: SubscriptionStatus.CANCELED },
    });
  }

  async processMembershipExpirationsAndAlerts() {
    const now = new Date();
    const in7Days = new Date(now);
    in7Days.setDate(in7Days.getDate() + 7);

    const [expiringSoon, expiredNow] = await Promise.all([
      this.prisma.subscription.findMany({
        where: {
          isCurrent: true,
          status: SubscriptionStatus.ACTIVE,
          endDate: { gte: now, lte: in7Days },
        },
        include: {
          user: {
            select: { id: true, tenantId: true, name: true, email: true },
          },
        },
      }),
      this.prisma.subscription.findMany({
        where: {
          isCurrent: true,
          status: SubscriptionStatus.ACTIVE,
          endDate: { lt: now },
        },
        include: {
          user: {
            select: { id: true, tenantId: true, name: true, email: true },
          },
        },
      }),
    ]);

    for (const s of expiringSoon) {
      await this.notifications.createAndEmit({
        userId: s.userId,
        tenantId: s.user?.tenantId ?? null,
        title: 'Membresía próxima a vencer',
        message: `Tu membresía vence el ${s.endDate.toLocaleDateString('es')}. Renueva para mantener tu acceso.`,
        type: 'warning',
        metadata: {
          subscriptionId: s.id,
          endDate: s.endDate.toISOString(),
        },
      });
    }

    for (const s of expiredNow) {
      await this.prisma.subscription.update({
        where: { id: s.id },
        data: { status: SubscriptionStatus.EXPIRED },
      });

      await this.notifications.createAndEmit({
        userId: s.userId,
        tenantId: s.user?.tenantId ?? null,
        title: 'Membresía vencida',
        message: 'Tu membresía ha vencido.',
        type: 'error',
        metadata: {
          subscriptionId: s.id,
          endDate: s.endDate.toISOString(),
        },
      });

      await this.auditLogs.append({
        tenantId: s.user?.tenantId,
        userId: null,
        action: 'subscription_auto_expired',
        details: {
          summary: `Suscripción expirada automáticamente para ${s.user?.name || s.user?.email || s.userId}`,
          subscriptionId: s.id,
          userId: s.userId,
        },
      });
    }

    return {
      expiringSoon: expiringSoon.length,
      expired: expiredNow.length,
    };
  }
}
