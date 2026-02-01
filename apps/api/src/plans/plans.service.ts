import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class PlansService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.PlanCreateInput) {
    return this.prisma.plan.create({ data });
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
    return this.prisma.plan.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.plan.delete({ where: { id } });
  }
}
