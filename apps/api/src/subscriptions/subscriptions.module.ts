import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { PlansModule } from '../plans/plans.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { MembershipCronService } from './membership-cron.service';

@Module({
  imports: [PlansModule, AuditLogsModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, MembershipCronService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
