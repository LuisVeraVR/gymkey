import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post('subscribe')
  @Roles(UserRole.MEMBER)
  subscribe(@Request() req: any, @Body('planId') planId: string) {
    return this.subscriptionsService.subscribe(req.user.userId, planId);
  }

  @Get('my-subscription')
  getMySubscription(@Request() req: any) {
    return this.subscriptionsService.findByUser(req.user.userId);
  }
}
