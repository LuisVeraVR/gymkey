import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { NotificationsGateway } from '../notifications/notifications.gateway';

@Injectable()
export class DiscountsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsGateway,
  ) {}

  async create(data: Prisma.DiscountCreateInput) {
    const discount = await this.prisma.discount.create({ 
      data,
      include: { plans: true } 
    });
    const tenantId = data.tenant?.connect?.id;
    if (tenantId) {
      this.notifications.sendToTenant(tenantId, 'discount_created', discount);
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
      include: { plans: true }
    });
    if (!discount) throw new NotFoundException('Discount not found');
    return discount;
  }

  async update(id: string, data: Prisma.DiscountUpdateInput) {
    const discount = await this.prisma.discount.update({
      where: { id },
      data,
      include: { plans: true }
    });
    if (discount.tenantId) {
      this.notifications.sendToTenant(discount.tenantId, 'discount_updated', discount);
    }
    return discount;
  }

  async remove(id: string) {
    const discount = await this.prisma.discount.delete({ where: { id } });
    if (discount.tenantId) {
      this.notifications.sendToTenant(discount.tenantId, 'discount_deleted', { id });
    }
    return discount;
  }
}
