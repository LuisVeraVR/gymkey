import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class SettingsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsGateway,
    private auditLogs: AuditLogsService,
  ) {}

  async getSettings(tenantId: string) {
    if (!tenantId) return null;
    return this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, config: true, slug: true },
    });
  }

  async getRuntimeConfig(tenantId: string) {
    if (!tenantId) {
      return {
        name: 'GymKey',
        offlineToleranceMinutes: 5,
        showPublicPortal: false,
        branding: null,
      };
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, config: true },
    });

    const cfg = (tenant?.config as Record<string, unknown> | null) || {};
    return {
      name:
        typeof tenant?.name === 'string' && tenant.name.trim()
          ? tenant.name
          : 'GymKey',
      offlineToleranceMinutes:
        typeof cfg.offlineToleranceMinutes === 'number'
          ? cfg.offlineToleranceMinutes
          : 5,
      showPublicPortal:
        typeof cfg.showPublicPortal === 'boolean'
          ? cfg.showPublicPortal
          : Boolean(cfg.allowPublicRegistration),
      branding:
        cfg.branding && typeof cfg.branding === 'object'
          ? cfg.branding
          : null,
    };
  }

  async updateSettings(
    tenantId: string,
    updateSettingsDto: UpdateSettingsDto,
    actorId?: string,
  ) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');

    const previous = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, config: true },
    });

    // Validate Config Structure if provided
    if (updateSettingsDto.config) {
      const config = updateSettingsDto.config;
      // Basic validation example
      if (
        config.business &&
        typeof config.business.gracePeriodDays !== 'number'
      ) {
        // We could throw or just sanitize
      }
    }

    const data: Prisma.TenantUpdateInput = {};
    if (updateSettingsDto.name) {
      data.name = updateSettingsDto.name;
    }
    if (updateSettingsDto.config) {
      data.config = updateSettingsDto.config;
    }

    const updatedTenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data,
    });

    this.notifications.sendToTenant(tenantId, 'settings_updated', {
      name: updatedTenant.name,
      config: updatedTenant.config,
      slug: updatedTenant.slug,
    });

    const prevCfg = (previous?.config as Record<string, unknown>) || {};
    const newCfg = (updatedTenant.config as Record<string, unknown>) || {};
    const parts: string[] = [];
    if (String(prevCfg.currency ?? '') !== String(newCfg.currency ?? '')) {
      parts.push(
        `Moneda: ${String(prevCfg.currency ?? '—')} → ${String(newCfg.currency ?? '—')}`,
      );
    }
    if (String(prevCfg.locale ?? '') !== String(newCfg.locale ?? '')) {
      parts.push(
        `Locale: ${String(prevCfg.locale ?? '—')} → ${String(newCfg.locale ?? '—')}`,
      );
    }
    if (previous?.name !== updatedTenant.name) {
      parts.push(`Nombre: "${previous?.name ?? '—'}" → "${updatedTenant.name}"`);
    }
    const summary =
      parts.length > 0 ? parts.join('. ') : 'Configuración del gimnasio actualizada';

    await this.auditLogs.append({
      tenantId,
      userId: actorId,
      action: 'settings_changed',
      details: { summary },
    });

    return updatedTenant;
  }
}
