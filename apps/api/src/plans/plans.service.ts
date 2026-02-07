import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class PlansService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsGateway,
  ) {}

  async create(data: Prisma.PlanCreateInput) {
    const plan = await this.prisma.plan.create({ data });
    const tenantId = data.tenant?.connect?.id;
    if (tenantId) {
      this.notifications.sendToTenant(tenantId, 'plan_created', plan);
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

  async update(id: string, data: Prisma.PlanUpdateInput) {
    const plan = await this.prisma.plan.update({
      where: { id },
      data,
    });
    if (plan.tenantId) {
      this.notifications.sendToTenant(plan.tenantId, 'plan_updated', plan);
    }
    return plan;
  }

  async remove(id: string) {
    const plan = await this.prisma.plan.delete({ where: { id } });
    if (plan.tenantId) {
      this.notifications.sendToTenant(plan.tenantId, 'plan_deleted', { id });
    }
    return plan;
  }
}
