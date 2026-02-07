import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Roles(UserRole.GYM_ADMIN, UserRole.SUPER_ADMIN)
  async getSettings(@Request() req: any) {
    const settings = await this.settingsService.getSettings(req.user.tenantId);
    if (!settings) {
      // Return default settings if not found to prevent UI blocking
      return {
        name: 'Gym Name',
        slug: 'gym-slug',
        config: {
          currency: 'USD',
          locale: 'en-US'
        }
      };
    }
    return settings;
  }

  @Patch()
  @Roles(UserRole.GYM_ADMIN, UserRole.SUPER_ADMIN)
  updateSettings(@Body() updateSettingsDto: UpdateSettingsDto, @Request() req: any) {
    return this.settingsService.updateSettings(req.user.tenantId, updateSettingsDto);
  }
}
