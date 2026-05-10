import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private subscriptionsService: SubscriptionsService,
    private auditLogs: AuditLogsService,
    private notifications: NotificationsService,
  ) {}

  async findOne(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { subscriptions: { where: { isCurrent: true }, take: 1 } },
    });
    if (!user) return null;
    const { subscriptions, ...rest } = user;
    return { ...rest, subscription: subscriptions[0] ?? null };
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }

  private generateTemporaryPassword(length = 8) {
    const chars =
      'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let out = '';
    for (let i = 0; i < length; i += 1) {
      out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
  }

  async createForTenant(params: {
    tenantId: string;
    name: string;
    email: string;
    password: string;
    role: Prisma.UserCreateInput['role'];
    isActive?: boolean;
    mustChangePassword?: boolean;
    planId?: string;
  }) {
    const existing = await this.prisma.user.findUnique({
      where: { email: params.email },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException('Ya existe un usuario con ese correo');
    }

    const hashedPassword = await bcrypt.hash(params.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: params.name,
        email: params.email,
        password: hashedPassword,
        role: params.role,
        isActive: params.isActive ?? true,
        mustChangePassword: params.mustChangePassword ?? false,
        tenant: { connect: { id: params.tenantId } },
      },
    });

    if (params.planId) {
      await this.subscriptionsService.subscribe(user.id, params.planId);
    }

    return user;
  }

  async inviteMember(params: {
    tenantId: string;
    actorId: string;
    actorName?: string;
    memberName: string;
    email: string;
    planId?: string;
    temporaryPassword?: string;
  }) {
    const temporaryPassword = params.temporaryPassword || this.generateTemporaryPassword(8);
    const user = await this.createForTenant({
      tenantId: params.tenantId,
      name: params.memberName,
      email: params.email,
      password: temporaryPassword,
      role: 'MEMBER',
      isActive: true,
      mustChangePassword: true,
      planId: params.planId,
    });

    await this.auditLogs.append({
      tenantId: params.tenantId,
      userId: params.actorId,
      action: 'member_invited',
      details: {
        summary: `Miembro ${params.memberName} invitado por ${params.actorName || 'admin'}`,
        memberId: user.id,
      },
    });

    await this.notifications.createAndEmit({
      userId: params.actorId,
      tenantId: params.tenantId,
      title: 'Miembro creado',
      message: `Miembro ${params.memberName} creado exitosamente`,
      type: 'success',
      metadata: { memberId: user.id },
    });

    return { userId: user.id, temporaryPassword };
  }

  async findAll(tenantId: string) {
    const users = await this.prisma.user.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        subscriptions: {
          where: { isCurrent: true },
          take: 1,
          include: { plan: { select: { id: true, name: true } } },
        },
      },
    });
    return users.map(({ subscriptions, password: _pw, ...rest }) => {
      const sub = subscriptions[0];
      return {
        ...rest,
        subscription: sub
          ? {
              id: sub.id,
              planId: sub.planId,
              planName: sub.plan?.name,
              status: sub.status,
              expiresAt: sub.endDate.toISOString(),
            }
          : null,
      };
    });
  }

  async update(
    id: string,
    data: Prisma.UserUpdateInput & { planId?: string | null },
  ): Promise<User> {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const incoming = { ...(data as Record<string, unknown>) };
    const planId = incoming.planId as string | null | undefined;
    delete incoming.planId;

    const safeData = { ...(incoming as unknown as Prisma.UserUpdateInput) };
    if (typeof safeData.password === 'string') {
      safeData.password = await bcrypt.hash(safeData.password as string, 10);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: safeData,
    });

    if (planId !== undefined && existing.role === UserRole.MEMBER) {
      if (planId === null || planId === '') {
        await this.subscriptionsService.clearCurrentPlan(id);
      } else {
        const currentSub = await this.prisma.subscription.findFirst({
          where: { userId: id, isCurrent: true },
          select: { planId: true },
        });
        if (!currentSub || currentSub.planId !== planId) {
          await this.subscriptionsService.updateActivePlan(id, planId);
        }
      }
    }

    return user;
  }

  async remove(id: string): Promise<User> {
    return this.prisma.user.delete({
      where: { id },
    });
  }

  async enablePasswordChange(id: string, enable: boolean): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { mustChangePassword: enable },
    });
  }
}
