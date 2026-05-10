import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';
import type { Prisma } from '@prisma/client';

export type CreateNotificationParams = {
  userId: string;
  tenantId?: string | null;
  title: string;
  message: string;
  type?: string;
  metadata?: Prisma.InputJsonValue;
};

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  broadcast(event: string, data: unknown) {
    this.notificationsGateway.server.emit(event, data);
  }

  notifyRoom(room: string, event: string, data: unknown) {
    this.notificationsGateway.server.to(room).emit(event, data);
  }

  private toWire(n: {
    id: string;
    title: string;
    message: string;
    type: string;
    read: boolean;
    userId: string;
    tenantId: string | null;
    metadata: Prisma.JsonValue | null;
    createdAt: Date;
  }) {
    return {
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      read: n.read,
      userId: n.userId,
      tenantId: n.tenantId,
      metadata: n.metadata,
      createdAt: n.createdAt.toISOString(),
    };
  }

  async createAndEmit(params: CreateNotificationParams) {
    const row = await this.prisma.notification.create({
      data: {
        userId: params.userId,
        tenantId: params.tenantId ?? undefined,
        title: params.title,
        message: params.message,
        type: params.type ?? 'info',
        ...(params.metadata !== undefined ? { metadata: params.metadata } : {}),
      },
    });
    const payload = this.toWire(row);
    this.notificationsGateway.sendToUser(params.userId, 'notification', payload);
    return row;
  }

  async findForUser(
    userId: string,
    opts: { page?: number; limit?: number; unreadOnly?: boolean },
  ) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(opts.unreadOnly ? { read: false } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      items: items.map((n) => this.toWire(n)),
      total,
      page,
      limit,
    };
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, read: false },
    });
    return { count };
  }

  async markRead(userId: string, id: string) {
    const existing = await this.prisma.notification.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Notificación no encontrada');
    }
    if (existing.userId !== userId) {
      throw new ForbiddenException();
    }
    const updated = await this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });
    return this.toWire(updated);
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return { ok: true };
  }
}
