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
          endDate: { lt: now },
          status: SubscriptionStatus.ACTIVE,
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
}
