import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { UserRole, SubscriptionStatus, CheckinStatus } from '@prisma/client';
import { PlatformService } from '../platform/platform.service';

@Injectable()
export class AccessKeysService {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
    private prisma: PrismaService,
    private notifications: NotificationsGateway,
    private auditLogs: AuditLogsService,
    private platformService: PlatformService,
  ) {}

  async generateKey(userId: string, tenantId: string) {
    const user: any = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('El usuario no está activo');
    }

    // Check subscription for MEMBERS
    if (user.role === UserRole.MEMBER) {
      const subEndDate = user.subscription?.endDate
        ? new Date(user.subscription.endDate)
        : null;
      if (
        !user.subscription ||
        user.subscription.status !== SubscriptionStatus.ACTIVE ||
        (subEndDate && subEndDate < new Date())
      ) {
        throw new UnauthorizedException('Membresía vencida o inexistente');
      }
    }

    const payload = {
      sub: user.id,
      type: 'access_key',
      tenantId: user.tenantId,
      timestamp: Date.now(),
    };

    return {
      token: this.jwtService.sign(payload),
      expiresIn: 30, // seconds suggestion for frontend refresh
    };
  }

  async validateKey(token: string, adminTenantId: string, method = 'QR') {
    try {
      if ((method || '').toUpperCase() === 'NFC') {
        await this.platformService.assertFeatureEnabled(adminTenantId, 'nfcAccess');
      }
      const payload = await this.jwtService.verifyAsync(token);

      if (payload.type !== 'access_key') {
        throw new BadRequestException(
          'Token inválido: No es una llave de acceso',
        );
      }

      if (payload.tenantId !== adminTenantId) {
        throw new UnauthorizedException(
          'Este usuario pertenece a otro gimnasio',
        );
      }

      const user: any = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('Usuario no existe');
      }

      if (!user.isActive) {
        return this.recordCheckin(
          user.id,
          adminTenantId,
          CheckinStatus.DENIED,
          'Usuario INACTIVO o SUSPENDIDO',
          { name: user.name, email: user.email, photo: user.photo },
        );
      }

      if (user.role === UserRole.MEMBER) {
        const subEndDate = user.subscription?.endDate
          ? new Date(user.subscription.endDate)
          : null;
        if (!user.subscription) {
          return this.recordCheckin(
            user.id,
            adminTenantId,
            CheckinStatus.DENIED,
            'Sin Membresía',
            { name: user.name, email: user.email, photo: user.photo },
          );
        }
        if (user.subscription.status !== SubscriptionStatus.ACTIVE) {
          return this.recordCheckin(
            user.id,
            adminTenantId,
            CheckinStatus.DENIED,
            `Membresía ${user.subscription.status}`,
            { name: user.name, email: user.email, photo: user.photo },
          );
        }
        if (subEndDate && subEndDate < new Date()) {
          return this.recordCheckin(
            user.id,
            adminTenantId,
            CheckinStatus.DENIED,
            'Membresía vencida',
            { name: user.name, email: user.email, photo: user.photo },
          );
        }
      }

      return this.recordCheckin(
        user.id,
        adminTenantId,
        CheckinStatus.GRANTED,
        null,
        {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          photo: user.photo,
          status: user.isActive ? 'ACTIVE' : 'INACTIVE',
          subscription: user.subscription?.status || 'NONE',
        },
      );
    } catch (e) {
      return {
        valid: false,
        reason: 'Token expirado o inválido',
        error: e.message,
      };
    }
  }

  private async recordCheckin(
    userId: string,
    tenantId: string,
    status: CheckinStatus,
    reason: string | null,
    userSummary: Record<string, unknown>,
  ) {
    const valid = status === CheckinStatus.GRANTED;

    const checkin = await this.prisma.checkin.create({
      data: {
        userId,
        tenantId,
        status,
        method: 'QR',
        details: reason,
      },
    });

    const action = valid ? 'access_granted' : 'access_denied';
    this.notifications.sendToTenant(tenantId, 'checkin_created', {
      ...checkin,
      userName: userSummary.name || userSummary.email,
    });

    await this.auditLogs.append({
      tenantId,
      userId,
      action,
      details: {
        summary: valid
          ? `Acceso concedido a ${userSummary.name || userSummary.email}`
          : `Acceso denegado: ${reason}`,
        checkinId: checkin.id,
      },
    });

    return valid
      ? { valid: true, user: userSummary }
      : { valid: false, reason, user: userSummary };
  }
}
