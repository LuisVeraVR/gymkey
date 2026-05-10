import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { StartTrialDto } from './dto/start-trial.dto';
import { SubscribePlatformDto } from './dto/subscribe-platform.dto';
import { PlatformService } from './platform.service';

@Controller('platform')
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @UseGuards(JwtAuthGuard)
  @Get('subscription')
  getSubscription(@Request() req: any) {
    return this.platformService.getCurrentSubscription(req.user.tenantId);
  }

  @Public()
  @Get('plans')
  getPlans() {
    return this.platformService.getPlans();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('trial/start')
  @Roles(UserRole.GYM_ADMIN, UserRole.SUPER_ADMIN)
  startTrial(@Request() req: any, @Body() body: StartTrialDto) {
    return this.platformService.startTrial(req.user.tenantId, body.plan);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('subscribe')
  @Roles(UserRole.GYM_ADMIN, UserRole.SUPER_ADMIN)
  subscribe(@Request() req: any, @Body() body: SubscribePlatformDto) {
    return this.platformService.subscribe(
      req.user.tenantId,
      body.plan,
      body.billingAccountId,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('cancel')
  @Roles(UserRole.GYM_ADMIN, UserRole.SUPER_ADMIN)
  cancel(@Request() req: any) {
    return this.platformService.cancel(req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('usage')
  getUsage(@Request() req: any) {
    return this.platformService.getUsage(req.user.tenantId);
  }
}
