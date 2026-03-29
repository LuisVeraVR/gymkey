import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Prisma } from '@prisma/client';

@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) {}

  async append(params: {
    tenantId: string | null | undefined;
    userId: string | null | undefined;
    action: string;
    details?: Prisma.InputJsonValue;
  }) {
    const { tenantId, userId, action, details } = params;
    if (!tenantId) return;
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: userId ?? null,
        action,
        ...(details !== undefined ? { details } : {}),
      },
    });
  }

  findForTenant(tenantId: string | null, limit = 200) {
    if (!tenantId) {
      return Promise.resolve([]);
    }
    return this.prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { timestamp: 'desc' },
      take: Math.min(Math.max(limit, 1), 500),
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
  }
}
