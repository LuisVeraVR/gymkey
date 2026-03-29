import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.GYM_ADMIN,
    UserRole.STAFF,
    UserRole.COACH,
  )
  getStats(@Request() req: { user: { tenantId: string | null } }) {
    return this.dashboardService.getStats(req.user.tenantId);
  }
}
