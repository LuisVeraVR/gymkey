import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlansService } from '../plans/plans.service';
import { SubscriptionStatus } from '@prisma/client';

@Injectable()
export class SubscriptionsService {
  constructor(
    private prisma: PrismaService,
    private plansService: PlansService,
  ) {}

  async subscribe(userId: string, planId: string) {
    const plan = await this.plansService.findOne(planId);

    // Check if user already has an active subscription
    const existing = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (existing && existing.status === SubscriptionStatus.ACTIVE) {
      throw new BadRequestException(
        'El usuario ya tiene una suscripción activa',
      );
    }

    // Calculate end date based on plan duration
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + plan.duration);

    // Create or Update
    if (existing) {
      return this.prisma.subscription.update({
        where: { userId },
        data: {
          planId,
          status: SubscriptionStatus.ACTIVE,
          startDate,
          endDate,
        },
      });
    } else {
      return this.prisma.subscription.create({
        data: {
          userId,
          planId,
          status: SubscriptionStatus.ACTIVE,
          startDate,
          endDate,
        },
      });
    }
  }

  async findByUser(userId: string) {
    return this.prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });
  }

  async cancel(userId: string) {
    return this.prisma.subscription.update({
      where: { userId },
      data: { status: SubscriptionStatus.CANCELED },
    });
  }
}
