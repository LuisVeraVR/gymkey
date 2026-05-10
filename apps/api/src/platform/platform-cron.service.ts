import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PlatformSubscriptionStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PlatformCronService {
  private readonly logger = new Logger(PlatformCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async expireTrials() {
    const now = new Date();
    const trials = await this.prisma.platformSubscription.findMany({
      where: {
        status: PlatformSubscriptionStatus.TRIALING,
        trialEndDate: { lt: now },
      },
      include: {
        billingAccount: {
          include: {
            tenants: {
              select: { id: true },
            },
          },
        },
      },
    });

    for (const trial of trials) {
      await this.prisma.$transaction([
        this.prisma.platformSubscription.update({
          where: { id: trial.id },
          data: { status: PlatformSubscriptionStatus.EXPIRED },
        }),
        this.prisma.platformBillingAccount.update({
          where: { id: trial.billingAccountId },
          data: { status: PlatformSubscriptionStatus.EXPIRED },
        }),
      ]);

      for (const tenant of trial.billingAccount.tenants) {
        const admins = await this.prisma.user.findMany({
          where: {
            tenantId: tenant.id,
            role: { in: [UserRole.GYM_ADMIN, UserRole.SUPER_ADMIN] },
          },
          select: { id: true },
        });
        await Promise.all(
          admins.map((admin) =>
            this.notifications.createAndEmit({
              userId: admin.id,
              tenantId: tenant.id,
              title: 'Trial expirado',
              message:
                'Tu periodo de prueba ha finalizado. Elige un plan para seguir usando GymKey.',
              type: 'warning',
            }),
          ),
        );
      }
    }

    if (trials.length > 0) {
      this.logger.log(`Trials expirados procesados: ${trials.length}`);
    }
  }
}
