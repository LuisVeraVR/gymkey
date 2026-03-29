import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class DiscountsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsGateway,
    private auditLogs: AuditLogsService,
  ) {}

  async create(data: Prisma.DiscountCreateInput, actorId?: string) {
    const discount = await this.prisma.discount.create({
      data,
      include: { plans: true },
    });
    const tenantId = data.tenant?.connect?.id;
    if (tenantId) {
      this.notifications.sendToTenant(tenantId, 'discount_created', discount);
      await this.auditLogs.append({
        tenantId,
        userId: actorId,
        action: 'discount_created',
        details: {
          summary: `Descuento "${discount.name}" (${discount.code}) creado`,
          discountId: discount.id,
        },
      });
    }
    return discount;
  }

  async findAll(tenantId: string) {
    return this.prisma.discount.findMany({
      where: { tenantId },
      include: { plans: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const discount = await this.prisma.discount.findUnique({
      where: { id },
      include: { plans: true },
    });
    if (!discount) throw new NotFoundException('Discount not found');
    return discount;
  }

  async update(id: string, data: Prisma.DiscountUpdateInput, actorId?: string) {
    const discount = await this.prisma.discount.update({
      where: { id },
      data,
      include: { plans: true },
    });
    if (discount.tenantId) {
      this.notifications.sendToTenant(
        discount.tenantId,
        'discount_updated',
        discount,
      );
      await this.auditLogs.append({
        tenantId: discount.tenantId,
        userId: actorId,
        action: 'discount_updated',
        details: {
          summary: `Descuento "${discount.name}" (${discount.code}) actualizado`,
          discountId: discount.id,
        },
      });
    }
    return discount;
  }

  async remove(id: string, actorId?: string) {
    const discount = await this.prisma.discount.delete({ where: { id } });
    if (discount.tenantId) {
      this.notifications.sendToTenant(discount.tenantId, 'discount_deleted', {
        id,
      });
      await this.auditLogs.append({
        tenantId: discount.tenantId,
        userId: actorId,
        action: 'discount_deleted',
        details: {
          summary: `Descuento "${discount.name}" (${discount.code}) eliminado`,
          discountId: discount.id,
        },
      });
    }
    return discount;
  }
}
