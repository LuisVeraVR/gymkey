import {
  Controller,
  Get,
  Query,
  Request,
  Res,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ReportsService } from './reports.service';
import { RequireFeature } from '../platform/decorators/require-feature.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.GYM_ADMIN, UserRole.SUPER_ADMIN)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  private csvHeaders(res: Response, filename: string) {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=\"${filename}\"`);
  }

  private handlePdfNotImplemented(res: Response, format?: string) {
    if ((format || '').toLowerCase() === 'pdf') {
      res.status(HttpStatus.NOT_IMPLEMENTED).json({
        message: 'PDF no implementado en esta iteración',
      });
      return true;
    }
    return false;
  }

  @Get('payments')
  @RequireFeature('csvExport')
  async payments(
    @Request() req: { user: { tenantId: string } },
    @Query('startDate') startDate: string | undefined,
    @Query('endDate') endDate: string | undefined,
    @Query('format') format: string | undefined,
    @Res() res: Response,
  ) {
    if (this.handlePdfNotImplemented(res, format)) return;
    const csv = await this.reportsService.paymentsCsv(
      req.user.tenantId,
      startDate,
      endDate,
    );
    this.csvHeaders(res, 'payments-report.csv');
    res.send(csv);
  }

  @Get('checkins')
  @RequireFeature('csvExport')
  async checkins(
    @Request() req: { user: { tenantId: string } },
    @Query('startDate') startDate: string | undefined,
    @Query('endDate') endDate: string | undefined,
    @Query('format') format: string | undefined,
    @Res() res: Response,
  ) {
    if (this.handlePdfNotImplemented(res, format)) return;
    const csv = await this.reportsService.checkinsCsv(
      req.user.tenantId,
      startDate,
      endDate,
    );
    this.csvHeaders(res, 'checkins-report.csv');
    res.send(csv);
  }

  @Get('members')
  @RequireFeature('csvExport')
  async members(
    @Request() req: { user: { tenantId: string } },
    @Query('startDate') startDate: string | undefined,
    @Query('endDate') endDate: string | undefined,
    @Query('format') format: string | undefined,
    @Res() res: Response,
  ) {
    if (this.handlePdfNotImplemented(res, format)) return;
    const csv = await this.reportsService.membersCsv(
      req.user.tenantId,
      startDate,
      endDate,
    );
    this.csvHeaders(res, 'members-report.csv');
    res.send(csv);
  }
}
