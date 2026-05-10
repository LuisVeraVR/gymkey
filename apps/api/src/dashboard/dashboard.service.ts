import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CheckinStatus,
  PaymentStatus,
  SubscriptionStatus,
} from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(tenantId: string | null) {
    if (!tenantId) {
      return {
        totalUsers: 0,
        activeUsers: 0,
        accessesToday: 0,
        expiredMemberships: 0,
        monthlyRevenue: 0,
        recentAccess: [] as Array<{
          id: string;
          userName: string;
          time: string;
          status: 'granted' | 'denied';
        }>,
      };
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(
      startOfDay.getFullYear(),
      startOfDay.getMonth(),
      1,
    );
    const now = new Date();

    const [
      totalUsers,
      activeUsers,
      accessesToday,
      expiredMemberships,
      revenueAgg,
      recentCheckins,
    ] = await Promise.all([
      this.prisma.user.count({ where: { tenantId } }),
      this.prisma.user.count({ where: { tenantId, isActive: true } }),
      this.prisma.checkin.count({
        where: {
          tenantId,
          timestamp: { gte: startOfDay },
          status: CheckinStatus.GRANTED,
        },
      }),
      this.prisma.subscription.count({
        where: {
          user: { tenantId },
          isCurrent: true,
          status: SubscriptionStatus.EXPIRED,
        },
      }),
      this.prisma.payment.aggregate({
        where: {
          tenantId,
          status: PaymentStatus.COMPLETED,
          createdAt: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
      this.prisma.checkin.findMany({
        where: { tenantId },
        orderBy: { timestamp: 'desc' },
        take: 10,
        include: { user: { select: { name: true, email: true } } },
      }),
    ]);

    const monthlyRevenue = revenueAgg._sum.amount
      ? Number(revenueAgg._sum.amount)
      : 0;

    const recentAccess = recentCheckins.map((c) => ({
      id: c.id,
      userName: c.user?.name?.trim() || c.user?.email || 'Usuario',
      time: c.timestamp.toISOString(),
      status:
        c.status === CheckinStatus.GRANTED
          ? ('granted' as const)
          : ('denied' as const),
    }));

    return {
      totalUsers,
      activeUsers,
      accessesToday,
      expiredMemberships,
      monthlyRevenue,
      recentAccess,
    };
  }

  async getAccessByDay(tenantId: string | null, days = 7) {
    if (!tenantId) return [];

    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const rows: Array<{ date: string; status: string; _count: number }> =
      await this.prisma.$queryRaw`
        SELECT DATE("timestamp") as date,
               status,
               COUNT(*)::int as "_count"
        FROM "Checkin"
        WHERE "tenantId" = ${tenantId}
          AND "timestamp" >= ${since}
        GROUP BY DATE("timestamp"), status
        ORDER BY date
      `;

    const map = new Map<string, { date: string; granted: number; denied: number }>();
    for (const r of rows) {
      const key = typeof r.date === 'string' ? r.date : new Date(r.date).toISOString().slice(0, 10);
      if (!map.has(key)) map.set(key, { date: key, granted: 0, denied: 0 });
      const entry = map.get(key)!;
      if (r.status === 'GRANTED') entry.granted = Number(r._count);
      else entry.denied = Number(r._count);
    }

    return Array.from(map.values());
  }

  async getOccupancyHeatmap(tenantId: string | null, months = 3) {
    if (!tenantId) return { maxCount: 0, cells: [] as Array<{ dow: number; hour: number; count: number; intensity: number }> };

    const since = new Date();
    since.setMonth(since.getMonth() - Math.max(1, months));
    since.setHours(0, 0, 0, 0);

    const rows: Array<{ dow: number; hour: number; count: number }> =
      await this.prisma.$queryRaw`
        SELECT EXTRACT(DOW FROM "timestamp")::int AS dow,
               EXTRACT(HOUR FROM "timestamp")::int AS hour,
               COUNT(*)::int AS count
        FROM "Checkin"
        WHERE "tenantId" = ${tenantId}
          AND "timestamp" >= ${since}
          AND "status" = 'GRANTED'
        GROUP BY 1, 2
      `;

    const map = new Map<string, number>();
    for (const r of rows) {
      map.set(`${r.dow}-${r.hour}`, Number(r.count));
    }

    const cells: Array<{ dow: number; hour: number; count: number; intensity: number }> = [];
    let maxCount = 0;
    for (let dow = 0; dow < 7; dow += 1) {
      for (let hour = 6; hour < 22; hour += 1) {
        const count = map.get(`${dow}-${hour}`) ?? 0;
        if (count > maxCount) maxCount = count;
        cells.push({ dow, hour, count, intensity: 0 });
      }
    }

    return {
      maxCount,
      cells: cells.map((c) => ({
        ...c,
        intensity: maxCount > 0 ? Number((c.count / maxCount).toFixed(4)) : 0,
      })),
    };
  }

  async getRetention(tenantId: string | null, months = 3) {
    if (!tenantId) return [];

    const countMonths = Math.max(1, Math.min(24, months));
    const out: Array<{
      month: string;
      totalStart: number;
      retained: number;
      rate: number;
      churn: number;
    }> = [];

    const now = new Date();
    for (let i = countMonths - 1; i >= 0; i -= 1) {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1, 0, 0, 0, 0));
      const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1, 0, 0, 0, 0));

      const [totalStart, retained] = await Promise.all([
        this.prisma.subscription.count({
          where: {
            user: { tenantId },
            isCurrent: true,
            status: SubscriptionStatus.ACTIVE,
            startDate: { lt: start },
            endDate: { gte: start },
          },
        }),
        this.prisma.subscription.count({
          where: {
            user: { tenantId },
            isCurrent: true,
            status: SubscriptionStatus.ACTIVE,
            startDate: { lt: start },
            endDate: { gte: end },
          },
        }),
      ]);

      const rate = totalStart > 0 ? (retained / totalStart) * 100 : 0;
      out.push({
        month: start.toISOString().slice(0, 7),
        totalStart,
        retained,
        rate: Number(rate.toFixed(2)),
        churn: Number((100 - rate).toFixed(2)),
      });
    }

    return out;
  }

  async getSidebarIndicators(tenantId: string | null) {
    if (!tenantId) {
      return { accessTodayCount: 0, recentAuditCount: 0 };
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const lastHour = new Date(Date.now() - 60 * 60 * 1000);

    const [accessTodayCount, recentAuditCount] = await Promise.all([
      this.prisma.checkin.count({
        where: {
          tenantId,
          timestamp: { gte: startOfDay },
        },
      }),
      this.prisma.auditLog.count({
        where: {
          tenantId,
          timestamp: { gte: lastHour },
        },
      }),
    ]);

    return {
      accessTodayCount,
      recentAuditCount,
    };
  }
}
