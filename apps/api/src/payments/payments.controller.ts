import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { Public } from '../auth/public.decorator';

@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  create(@Body() createPaymentDto: CreatePaymentDto, @Request() req: any) {
    // If userId is provided and user is admin, use it. Otherwise use current user.
    const targetUserId = (createPaymentDto.userId && ['GYM_ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) 
      ? createPaymentDto.userId 
      : req.user.id;

    return this.paymentsService.create(createPaymentDto, targetUserId, req.user.tenantId);
  }

  @Public()
  @Post('webhook')
  webhook(@Body() payload: any) {
    return this.paymentsService.handleWebhook(payload);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.GYM_ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF)
  @Get()
  findAll(@Request() req: any) {
    return this.paymentsService.findAll(req.user.tenantId);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.GYM_ADMIN, UserRole.SUPER_ADMIN)
  @Get('report')
  findByDateRange(
    @Request() req: any,
    @Body('startDate') startDate: string,
    @Body('endDate') endDate: string,
  ) {
    return this.paymentsService.findByDateRange(
      req.user.tenantId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.GYM_ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF, UserRole.MEMBER)
  @Get('my-payments')
  findMyPayments(@Request() req: any) {
    return this.paymentsService.findByUser(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }

  @Patch(':id/refund')
  @UseGuards(RolesGuard)
  @Roles(UserRole.GYM_ADMIN, UserRole.SUPER_ADMIN)
  refund(@Param('id') id: string) {
    return this.paymentsService.refund(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.GYM_ADMIN, UserRole.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() updatePaymentDto: UpdatePaymentDto) {
    return this.paymentsService.update(id, updatePaymentDto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.GYM_ADMIN, UserRole.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.paymentsService.remove(id);
  }
}
