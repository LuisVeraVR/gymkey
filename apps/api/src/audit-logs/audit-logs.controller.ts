import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { AuditLogsService } from './audit-logs.service';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.GYM_ADMIN,
    UserRole.STAFF,
    UserRole.COACH,
  )
  list(
    @Request() req: { user: { tenantId: string | null } },
    @Query('limit') limitRaw?: string,
  ) {
    const limit = limitRaw ? Number.parseInt(limitRaw, 10) : 200;
    return this.auditLogsService.findForTenant(req.user.tenantId, limit);
  }
}
