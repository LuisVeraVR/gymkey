import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function toCsvValue(v: unknown) {
  const str = v === null || v === undefined ? '' : String(v);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(headers: string[], rows: Array<Array<unknown>>) {
  const lines = [headers.map(toCsvValue).join(',')];
  for (const row of rows) {
    lines.push(row.map(toCsvValue).join(','));
  }
  return `${lines.join('\n')}\n`;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private resolveRange(startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    return {
      ...(start && !Number.isNaN(start.getTime()) ? { gte: start } : {}),
      ...(end && !Number.isNaN(end.getTime()) ? { lte: end } : {}),
    };
  }

  async paymentsCsv(tenantId: string, startDate?: string, endDate?: string) {
    const createdAt = this.resolveRange(startDate, endDate);
    const rows = await this.prisma.payment.findMany({
      where: {
        tenantId,
        ...(Object.keys(createdAt).length ? { createdAt } : {}),
      },
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return toCsv(
      ['id', 'date', 'member_name', 'member_email', 'amount', 'currency', 'status', 'method', 'provider'],
      rows.map((r) => [
        r.id,
        r.createdAt.toISOString(),
        r.user?.name || '',
        r.user?.email || '',
        Number(r.amount),
        r.currency,
        r.status,
        r.method,
        r.provider || '',
      ]),
    );
  }

  async checkinsCsv(tenantId: string, startDate?: string, endDate?: string) {
    const timestamp = this.resolveRange(startDate, endDate);
    const rows = await this.prisma.checkin.findMany({
      where: {
        tenantId,
        ...(Object.keys(timestamp).length ? { timestamp } : {}),
      },
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { timestamp: 'desc' },
    });

    return toCsv(
      ['id', 'timestamp', 'member_name', 'member_email', 'status', 'method', 'details'],
      rows.map((r) => [
        r.id,
        r.timestamp.toISOString(),
        r.user?.name || '',
        r.user?.email || '',
        r.status,
        r.method,
        r.details || '',
      ]),
    );
  }

  async membersCsv(tenantId: string, startDate?: string, endDate?: string) {
    const createdAt = this.resolveRange(startDate, endDate);
    const rows = await this.prisma.user.findMany({
      where: {
        tenantId,
        ...(Object.keys(createdAt).length ? { createdAt } : {}),
      },
      include: {
        subscriptions: {
          where: { isCurrent: true },
          take: 1,
          include: { plan: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return toCsv(
      ['id', 'created_at', 'name', 'email', 'role', 'is_active', 'subscription_status', 'plan_name'],
      rows.map((u) => {
        const current = u.subscriptions[0];
        return [
          u.id,
          u.createdAt.toISOString(),
          u.name || '',
          u.email,
          u.role,
          u.isActive ? 'true' : 'false',
          current?.status || '',
          current?.plan?.name || '',
        ];
      }),
    );
  }
}
