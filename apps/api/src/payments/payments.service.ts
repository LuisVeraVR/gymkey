import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentStatus, SubscriptionStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async create(
    createPaymentDto: CreatePaymentDto,
    userId: string,
    tenantId: string,
  ) {
    const { planId, amount, method, provider } = createPaymentDto;

    // 1. Validate Plan
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    // 2. Create Payment Record (Pending)
    const payment = await this.prisma.payment.create({
      data: {
        amount,
        method,
        provider: provider || 'MANUAL',
        status: PaymentStatus.PENDING,
        user: { connect: { id: userId } },
        tenant: { connect: { id: tenantId } },
      },
    });

    // 3. Process Payment (Simulation)
    // If 'SIMULATED' (app demo) or 'CASH' (immediate approval logic if desired), we auto-approve.
    if (method === 'SIMULATED' || method === 'CARD_TEST') {
      return this.confirmPayment(payment.id, planId);
    }

    return payment;
  }

  async confirmPayment(paymentId: string, planId: string) {
    // 1. Update Payment
    const payment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.COMPLETED },
      include: { user: true },
    });

    // 2. Get Plan details for duration
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });
    if (!plan) throw new NotFoundException('Plan not found');

    // 3. Create/Update Subscription
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + plan.duration);

    const existingSub = await this.prisma.subscription.findUnique({
      where: { userId: payment.userId },
    });

    let sub;
    if (existingSub) {
      sub = await this.prisma.subscription.update({
        where: { id: existingSub.id },
        data: {
          status: SubscriptionStatus.ACTIVE,
          planId: plan.id,
          startDate,
          endDate,
        },
      });
    } else {
      sub = await this.prisma.subscription.create({
        data: {
          userId: payment.userId,
          planId: plan.id,
          status: SubscriptionStatus.ACTIVE,
          startDate,
          endDate,
        },
      });
    }

    // 4. Link payment to subscription
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { subscriptionId: sub.id },
    });

    // 5. Ensure AccessKey exists
    const existingKey = await this.prisma.accessKey.findUnique({
      where: { userId: payment.userId },
    });

    if (!existingKey) {
      await this.prisma.accessKey.create({
        data: {
          userId: payment.userId,
        },
      });
    }

    return { payment, subscription: sub };
  }

  handleWebhook(payload: any) {
    console.log('Webhook Received:', payload);
    return { received: true };
  }

  findAll(tenantId: string) {
    if (!tenantId) return [];
    return this.prisma.payment.findMany({
      where: { tenantId },
      include: { user: true, subscription: { include: { plan: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.payment.findUnique({ where: { id } });
  }

  async refund(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { subscription: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new Error('Only completed payments can be refunded');
    }

    // 1. Mark payment as refunded
    const refundedPayment = await this.prisma.payment.update({
      where: { id },
      data: { status: PaymentStatus.REFUNDED },
    });

    // 2. If associated with a subscription, we might want to cancel/suspend it or leave it to manual intervention.
    // For now, let's just log it or optionally suspend the subscription.
    if (payment.subscriptionId) {
      await this.prisma.subscription.update({
        where: { id: payment.subscriptionId },
        data: { status: SubscriptionStatus.CANCELED },
      });
    }

    return refundedPayment;
  }

  async findByUser(userId: string) {
    return this.prisma.payment.findMany({
      where: { userId },
      include: { subscription: { include: { plan: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByDateRange(tenantId: string, startDate: Date, endDate: Date) {
    return this.prisma.payment.findMany({
      where: {
        tenantId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: { user: true, subscription: { include: { plan: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  update(id: string, updatePaymentDto: UpdatePaymentDto) {
    return this.prisma.payment.update({
      where: { id },
      data: updatePaymentDto,
    });
  }

  remove(id: string) {
    return this.prisma.payment.delete({ where: { id } });
  }
}
