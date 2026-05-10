import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PlatformPlan,
  PlatformSubscriptionStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PLAN_LIMITS, PLATFORM_PLAN_CATALOG, allowsStatus, comparePlans, getRequiredPlanForFeature, getRequiredPlanForLimit, isStaffRole, type PlatformFeature, type PlatformLimitKey } from './plan-limits';
import type {
  PlatformBillingAccountWithRelations,
  PlatformRequestContext,
  PlatformUsage,
} from './platform.types';

const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;

@Injectable()
export class PlatformService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private selectBillingAccount = {
    subscription: true,
    tenants: {
      select: { id: true, name: true, slug: true },
      orderBy: { createdAt: 'asc' as const },
    },
  } satisfies Prisma.PlatformBillingAccountInclude;

  async getContextForTenant(tenantId: string | null | undefined): Promise<PlatformRequestContext | null> {
    if (!tenantId) return null;

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        billingAccount: {
          include: this.selectBillingAccount,
        },
      },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant no encontrado');
    }

    let billingAccount = tenant.billingAccount as PlatformBillingAccountWithRelations | null;
    if (!billingAccount) {
      billingAccount = await this.ensureDemoAccountForTenant(tenantId);
    }

    let subscription = billingAccount.subscription;
    if (!subscription) {
      subscription = await this.prisma.platformSubscription.create({
        data: {
          billingAccountId: billingAccount.id,
          plan: billingAccount.plan,
          status: billingAccount.status,
          trialStartDate: billingAccount.trialStartDate,
          trialEndDate: billingAccount.trialEndDate,
          currentPeriodStart: billingAccount.currentPeriodStart,
          currentPeriodEnd: billingAccount.currentPeriodEnd,
          externalCustomerId: billingAccount.externalCustomerId,
          externalSubscriptionId: billingAccount.externalSubscriptionId,
          canceledAt: billingAccount.canceledAt,
        },
      });
      billingAccount = await this.prisma.platformBillingAccount.findUniqueOrThrow({
        where: { id: billingAccount.id },
        include: this.selectBillingAccount,
      }) as PlatformBillingAccountWithRelations;
    }

    const refreshed = await this.refreshExpiredTrialStatus(billingAccount.id);
    if (refreshed) {
      billingAccount = refreshed.billingAccount;
      subscription = refreshed.subscription;
    }

    return {
      billingAccount,
      subscription,
      plan: subscription?.plan ?? billingAccount.plan,
      status: subscription?.status ?? billingAccount.status,
      limits: PLAN_LIMITS[subscription?.plan ?? billingAccount.plan],
    };
  }

  async assertTenantAccess(tenantId: string | null | undefined) {
    const context = await this.getContextForTenant(tenantId);
    if (!context) return null;
    if (!allowsStatus(context.status, context.plan)) {
      throw new ForbiddenException({
        statusCode: 403,
        subscriptionStatus: context.status,
        message:
          context.status === PlatformSubscriptionStatus.EXPIRED
            ? 'Tu periodo de prueba de 15 días ha finalizado. Elige un plan para continuar usando GymKey.'
            : 'La suscripción de tu gimnasio no está activa. Actualiza o reactiva el plan para continuar.',
      });
    }
    return context;
  }

  async assertFeatureEnabled(
    tenantId: string | null | undefined,
    feature: PlatformFeature,
  ) {
    const context = await this.assertTenantAccess(tenantId);
    if (!context) return null;
    if (!context.limits.features[feature]) {
      throw new ForbiddenException({
        statusCode: 403,
        feature,
        requiredPlan: getRequiredPlanForFeature(feature),
        message: `Esta función requiere el plan ${PLATFORM_PLAN_CATALOG[getRequiredPlanForFeature(feature)].name}. Actualiza tu suscripción para acceder.`,
      });
    }
    return context;
  }

  async assertLimitAvailable(
    tenantId: string | null | undefined,
    limit: PlatformLimitKey,
    current: number,
  ) {
    const context = await this.assertTenantAccess(tenantId);
    if (!context) return null;
    const max = context.limits[limit];
    if (max >= 0 && current >= max) {
      throw new ForbiddenException({
        statusCode: 403,
        limit,
        current,
        max,
        requiredPlan: getRequiredPlanForLimit(limit),
        message: `Has alcanzado el límite de ${max} para ${limit} en tu plan ${PLATFORM_PLAN_CATALOG[context.plan].name}.`,
      });
    }
    return context;
  }

  async getCurrentSubscription(tenantId: string | null | undefined) {
    const context = await this.getContextForTenant(tenantId);
    if (!context) {
      throw new NotFoundException('No se encontró una suscripción de plataforma para este tenant');
    }
    return {
      ...context.subscription,
      plan: context.plan,
      status: context.status,
      limits: context.limits,
      billingAccount: context.billingAccount
        ? {
            id: context.billingAccount.id,
            name: context.billingAccount.name,
            email: context.billingAccount.email,
            hasUsedTrial: context.billingAccount.hasUsedTrial,
            tenantLimit: context.billingAccount.tenantLimit,
            tenants: context.billingAccount.tenants,
          }
        : null,
    };
  }

  getPlans() {
    return Object.values(PLATFORM_PLAN_CATALOG);
  }

  async startTrial(tenantId: string, plan: PlatformPlan) {
    if (plan === PlatformPlan.DEMO) {
      throw new BadRequestException('El plan DEMO no usa trial');
    }
    const context = await this.getContextForTenant(tenantId);
    if (!context || !context.billingAccount) {
      throw new NotFoundException('No existe una cuenta de facturación para este tenant');
    }
    if (context.plan !== PlatformPlan.DEMO) {
      throw new BadRequestException('Solo se puede iniciar un trial desde DEMO');
    }
    if (context.billingAccount.hasUsedTrial) {
      throw new BadRequestException('Este gimnasio ya consumió su trial gratuito');
    }

    const now = new Date();
    const trialEndDate = new Date(now.getTime() + FIFTEEN_DAYS_MS);

    const [billingAccount, subscription] = await this.prisma.$transaction([
      this.prisma.platformBillingAccount.update({
        where: { id: context.billingAccount.id },
        data: {
          plan,
          status: PlatformSubscriptionStatus.TRIALING,
          hasUsedTrial: true,
          trialStartDate: now,
          trialEndDate,
          currentPeriodStart: now,
          currentPeriodEnd: trialEndDate,
          tenantLimit: PLAN_LIMITS[plan].maxLocations,
        },
      }),
      this.prisma.platformSubscription.upsert({
        where: { billingAccountId: context.billingAccount.id },
        update: {
          plan,
          status: PlatformSubscriptionStatus.TRIALING,
          trialStartDate: now,
          trialEndDate,
          currentPeriodStart: now,
          currentPeriodEnd: trialEndDate,
        },
        create: {
          billingAccountId: context.billingAccount.id,
          plan,
          status: PlatformSubscriptionStatus.TRIALING,
          trialStartDate: now,
          trialEndDate,
          currentPeriodStart: now,
          currentPeriodEnd: trialEndDate,
        },
      }),
    ]);

    await this.notifyTenantAdmins(
      tenantId,
      'Trial iniciado',
      `Tu prueba gratuita del plan ${PLATFORM_PLAN_CATALOG[plan].name} estará activa hasta ${trialEndDate.toLocaleDateString('es-CO')}.`,
    );

    return { billingAccount, subscription };
  }

  async subscribe(
    tenantId: string,
    plan: PlatformPlan,
    billingAccountId?: string,
  ) {
    const context = await this.getContextForTenant(tenantId);
    const accountId = billingAccountId || context?.billingAccount?.id;
    if (!accountId) {
      throw new NotFoundException('No existe cuenta de facturación para actualizar');
    }
    const account = await this.prisma.platformBillingAccount.findUnique({
      where: { id: accountId },
      include: { tenants: { select: { id: true } } },
    });
    if (!account) {
      throw new NotFoundException('Cuenta de facturación no encontrada');
    }
    if (!account.tenants.some((tenant) => tenant.id === tenantId)) {
      throw new ForbiddenException('Esta cuenta de facturación no pertenece al tenant actual');
    }

    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [billingAccount, subscription] = await this.prisma.$transaction([
      this.prisma.platformBillingAccount.update({
        where: { id: accountId },
        data: {
          plan,
          status: PlatformSubscriptionStatus.ACTIVE,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          canceledAt: null,
          tenantLimit: PLAN_LIMITS[plan].maxLocations,
        },
      }),
      this.prisma.platformSubscription.upsert({
        where: { billingAccountId: accountId },
        update: {
          plan,
          status: PlatformSubscriptionStatus.ACTIVE,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          canceledAt: null,
        },
        create: {
          billingAccountId: accountId,
          plan,
          status: PlatformSubscriptionStatus.ACTIVE,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      }),
    ]);

    await this.notifyTenantAdmins(
      tenantId,
      'Plan activado',
      `Tu gimnasio ahora usa el plan ${PLATFORM_PLAN_CATALOG[plan].name}.`,
    );

    return { billingAccount, subscription };
  }

  async cancel(tenantId: string) {
    const context = await this.getContextForTenant(tenantId);
    if (!context?.billingAccount) {
      throw new NotFoundException('No existe una suscripción de plataforma para cancelar');
    }
    const canceledAt = new Date();

    const [billingAccount, subscription] = await this.prisma.$transaction([
      this.prisma.platformBillingAccount.update({
        where: { id: context.billingAccount.id },
        data: {
          status: PlatformSubscriptionStatus.CANCELED,
          canceledAt,
        },
      }),
      this.prisma.platformSubscription.update({
        where: { billingAccountId: context.billingAccount.id },
        data: {
          status: PlatformSubscriptionStatus.CANCELED,
          canceledAt,
        },
      }),
    ]);

    await this.notifyTenantAdmins(
      tenantId,
      'Suscripción cancelada',
      'La suscripción de GymKey fue cancelada y permanecerá activa hasta el final del periodo vigente.',
    );

    return { billingAccount, subscription };
  }

  async getUsage(tenantId: string): Promise<PlatformUsage> {
    const context = await this.assertTenantAccess(tenantId);
    if (!context?.billingAccount) {
      throw new NotFoundException('No existe contexto de plataforma para este tenant');
    }

    const tenantIds = context.billingAccount.tenants.map((tenant) => tenant.id);

    const [members, staff, routines, classes] = await Promise.all([
      this.prisma.user.count({
        where: {
          tenantId: { in: tenantIds },
          role: UserRole.MEMBER,
          isActive: true,
        },
      }),
      this.prisma.user.count({
        where: {
          tenantId: { in: tenantIds },
          role: { in: [UserRole.GYM_ADMIN, UserRole.STAFF, UserRole.COACH] },
          isActive: true,
        },
      }),
      this.prisma.routine.count({ where: { tenantId: { in: tenantIds } } }),
      this.prisma.gymClass.count({ where: { tenantId: { in: tenantIds } } }),
    ]);

    return {
      members: { current: members, max: context.limits.maxMembers },
      staff: { current: staff, max: context.limits.maxStaff },
      routines: { current: routines, max: context.limits.maxRoutines },
      classes: { current: classes, max: context.limits.maxClasses },
      locations: {
        current: tenantIds.length,
        max: context.limits.maxLocations,
      },
    };
  }

  async getLimitUsageValue(tenantId: string, limit: PlatformLimitKey, role?: string) {
    const usage = await this.getUsage(tenantId);
    if (limit === 'maxMembers') {
      if (role && role !== UserRole.MEMBER) {
        return 0;
      }
      return usage.members.current;
    }
    if (limit === 'maxRoutines') return usage.routines.current;
    if (limit === 'maxClasses') return usage.classes.current;
    if (limit === 'maxLocations') return usage.locations.current;
    if (limit === 'maxStaff') {
      if (role && !isStaffRole(role)) {
        return 0;
      }
      return usage.staff.current;
    }
    return 0;
  }

  async isFeatureEnabled(tenantId: string, feature: PlatformFeature) {
    const context = await this.getContextForTenant(tenantId);
    if (!context) return false;
    return context.limits.features[feature];
  }

  async canChangePlan(
    billingAccountId: string,
    nextPlan: PlatformPlan,
  ) {
    const account = await this.prisma.platformBillingAccount.findUnique({
      where: { id: billingAccountId },
      include: {
        tenants: { select: { id: true } },
      },
    });
    if (!account) {
      throw new NotFoundException('Cuenta de facturación no encontrada');
    }
    const tenantIds = account.tenants.map((tenant) => tenant.id);
    const [members, staff, routines, classes] = await Promise.all([
      this.prisma.user.count({
        where: {
          tenantId: { in: tenantIds },
          role: UserRole.MEMBER,
          isActive: true,
        },
      }),
      this.prisma.user.count({
        where: {
          tenantId: { in: tenantIds },
          role: { in: [UserRole.GYM_ADMIN, UserRole.STAFF, UserRole.COACH] },
          isActive: true,
        },
      }),
      this.prisma.routine.count({ where: { tenantId: { in: tenantIds } } }),
      this.prisma.gymClass.count({ where: { tenantId: { in: tenantIds } } }),
    ]);
    const limits = PLAN_LIMITS[nextPlan];
    const violations: string[] = [];
    if (limits.maxMembers >= 0 && members > limits.maxMembers) {
      violations.push(`Miembros activos: ${members}/${limits.maxMembers}`);
    }
    if (limits.maxStaff >= 0 && staff > limits.maxStaff) {
      violations.push(`Staff activo: ${staff}/${limits.maxStaff}`);
    }
    if (limits.maxRoutines >= 0 && routines > limits.maxRoutines) {
      violations.push(`Rutinas: ${routines}/${limits.maxRoutines}`);
    }
    if (limits.maxClasses >= 0 && classes > limits.maxClasses) {
      violations.push(`Clases: ${classes}/${limits.maxClasses}`);
    }
    if (limits.maxLocations >= 0 && tenantIds.length > limits.maxLocations) {
      violations.push(`Sedes: ${tenantIds.length}/${limits.maxLocations}`);
    }
    return {
      allowed: violations.length === 0,
      violations,
    };
  }

  private async ensureDemoAccountForTenant(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, slug: true },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant no encontrado');
    }

    const account = (await this.prisma.platformBillingAccount.create({
      data: {
        name: `${tenant.name} Billing`,
        plan: PlatformPlan.DEMO,
        status: PlatformSubscriptionStatus.ACTIVE,
        tenantLimit: 1,
        tenants: {
          connect: { id: tenantId },
        },
        subscription: {
          create: {
            plan: PlatformPlan.DEMO,
            status: PlatformSubscriptionStatus.ACTIVE,
          },
        },
      },
      include: this.selectBillingAccount,
    })) as PlatformBillingAccountWithRelations;

    return account;
  }

  private async refreshExpiredTrialStatus(billingAccountId: string) {
    const account = (await this.prisma.platformBillingAccount.findUnique({
      where: { id: billingAccountId },
      include: this.selectBillingAccount,
    })) as PlatformBillingAccountWithRelations | null;
    if (!account?.subscription) return null;
    if (
      account.subscription.status === PlatformSubscriptionStatus.TRIALING &&
      account.subscription.trialEndDate &&
      account.subscription.trialEndDate.getTime() < Date.now()
    ) {
      const [billingAccount, subscription] = await this.prisma.$transaction([
        this.prisma.platformBillingAccount.update({
          where: { id: billingAccountId },
          data: { status: PlatformSubscriptionStatus.EXPIRED },
          include: this.selectBillingAccount,
        }),
        this.prisma.platformSubscription.update({
          where: { billingAccountId },
          data: { status: PlatformSubscriptionStatus.EXPIRED },
        }),
      ]);
      return {
        billingAccount: billingAccount as PlatformBillingAccountWithRelations,
        subscription,
      };
    }
    return null;
  }

  private async notifyTenantAdmins(
    tenantId: string,
    title: string,
    message: string,
  ) {
    const admins = await this.prisma.user.findMany({
      where: {
        tenantId,
        role: { in: [UserRole.GYM_ADMIN, UserRole.SUPER_ADMIN] },
      },
      select: { id: true },
    });
    await Promise.all(
      admins.map((admin) =>
        this.notifications.createAndEmit({
          userId: admin.id,
          tenantId,
          title,
          message,
          type: 'info',
        }),
      ),
    );
  }
}
