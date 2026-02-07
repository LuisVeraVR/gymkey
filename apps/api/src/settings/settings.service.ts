import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { Prisma } from '@prisma/client';

@Injectable()
export class SettingsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsGateway,
  ) {}

  async getSettings(tenantId: string) {
    if (!tenantId) return null;
    return this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, config: true, slug: true },
    });
  }

  async updateSettings(tenantId: string, updateSettingsDto: UpdateSettingsDto) {
    if (!tenantId) throw new BadRequestException('Tenant ID is required');

    // Validate Config Structure if provided
    if (updateSettingsDto.config) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
      const config = updateSettingsDto.config;
      // Basic validation example
      if (
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        config.business &&
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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

    return updatedTenant;
  }
}
