import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('list')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.GYM_ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.STAFF,
    UserRole.COACH,
  )
  listForTenant(@Request() req: { user: { tenantId: string | null } }) {
    return this.subscriptionsService.findAllByTenant(req.user.tenantId);
  }

  @Post('subscribe')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MEMBER)
  subscribe(@Request() req: any, @Body('planId') planId: string) {
    if (!planId || typeof planId !== 'string') {
      throw new BadRequestException('planId es obligatorio');
    }
    return this.subscriptionsService.subscribe(req.user.userId, planId);
  }

  @Get('my-subscription')
  getMySubscription(@Request() req: any) {
    return this.subscriptionsService.findByUser(req.user.userId);
  }

  @Get('history')
  getHistory(
    @Request() req: any,
    @Query('userId') userId?: string,
  ) {
    const targetUserId = userId || req.user.userId;
    return this.subscriptionsService.findHistoryByUser(targetUserId);
  }
}
