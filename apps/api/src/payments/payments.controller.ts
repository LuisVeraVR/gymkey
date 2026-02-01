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
    // User pays for themselves
    return this.paymentsService.create(createPaymentDto, req.user.id, req.user.tenantId);
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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updatePaymentDto: UpdatePaymentDto) {
  //   return this.paymentsService.update(id, updatePaymentDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.paymentsService.remove(id);
  // }
}
