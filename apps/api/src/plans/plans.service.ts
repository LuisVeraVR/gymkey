import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class PlansService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsGateway,
    private auditLogs: AuditLogsService,
  ) {}

  async create(data: Prisma.PlanCreateInput, actorId?: string) {
    const plan = await this.prisma.plan.create({ data });
    const tenantId = data.tenant?.connect?.id;
    if (tenantId) {
      this.notifications.sendToTenant(tenantId, 'plan_created', plan);
      await this.auditLogs.append({
        tenantId,
        userId: actorId,
        action: 'plan_created',
        details: {
          summary: `Plan "${plan.name}" creado`,
          planId: plan.id,
        },
      });
    }
    return plan;
  }

  async findAll(tenantId: string) {
    return this.prisma.plan.findMany({
      where: { tenantId },
      orderBy: { price: 'asc' },
    });
  }

  async findOne(id: string) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan no encontrado');
    return plan;
  }

  async update(id: string, data: Prisma.PlanUpdateInput, actorId?: string) {
    const plan = await this.prisma.plan.update({
      where: { id },
      data,
    });
    if (plan.tenantId) {
      this.notifications.sendToTenant(plan.tenantId, 'plan_updated', plan);
      await this.auditLogs.append({
        tenantId: plan.tenantId,
        userId: actorId,
        action: 'plan_updated',
        details: {
          summary: `Plan "${plan.name}" actualizado`,
          planId: plan.id,
        },
      });
    }
    return plan;
  }

  async remove(id: string, actorId?: string) {
    const plan = await this.prisma.plan.delete({ where: { id } });
    if (plan.tenantId) {
      this.notifications.sendToTenant(plan.tenantId, 'plan_deleted', { id });
      await this.auditLogs.append({
        tenantId: plan.tenantId,
        userId: actorId,
        action: 'plan_deleted',
        details: {
          summary: `Plan "${plan.name}" eliminado`,
          planId: plan.id,
        },
      });
    }
    return plan;
  }
}
