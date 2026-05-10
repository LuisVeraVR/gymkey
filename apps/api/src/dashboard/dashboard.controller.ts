import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { RequireFeature } from '../platform/decorators/require-feature.decorator';

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

  @Get('access-by-day')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.GYM_ADMIN,
    UserRole.STAFF,
    UserRole.COACH,
  )
  getAccessByDay(
    @Request() req: { user: { tenantId: string | null } },
    @Query('days') days?: string,
  ) {
    const parsed = days ? parseInt(days, 10) : 7;
    return this.dashboardService.getAccessByDay(
      req.user.tenantId,
      Number.isFinite(parsed) && parsed > 0 ? parsed : 7,
    );
  }

  @Get('occupancy-heatmap')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.GYM_ADMIN,
    UserRole.STAFF,
    UserRole.COACH,
  )
  @RequireFeature('advancedDashboard')
  getOccupancyHeatmap(
    @Request() req: { user: { tenantId: string | null } },
    @Query('months') months?: string,
  ) {
    const parsed = months ? parseInt(months, 10) : 3;
    return this.dashboardService.getOccupancyHeatmap(
      req.user.tenantId,
      Number.isFinite(parsed) && parsed > 0 ? parsed : 3,
    );
  }

  @Get('retention')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GYM_ADMIN, UserRole.STAFF)
  @RequireFeature('advancedDashboard')
  getRetention(
    @Request() req: { user: { tenantId: string | null } },
    @Query('months') months?: string,
  ) {
    const parsed = months ? parseInt(months, 10) : 3;
    return this.dashboardService.getRetention(
      req.user.tenantId,
      Number.isFinite(parsed) && parsed > 0 ? parsed : 3,
    );
  }

  @Get('sidebar-indicators')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.GYM_ADMIN,
    UserRole.STAFF,
    UserRole.COACH,
  )
  getSidebarIndicators(@Request() req: { user: { tenantId: string | null } }) {
    return this.dashboardService.getSidebarIndicators(req.user.tenantId);
  }
}
