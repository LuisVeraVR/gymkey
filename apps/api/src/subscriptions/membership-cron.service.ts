import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionsService } from './subscriptions.service';

@Injectable()
export class MembershipCronService {
  private readonly logger = new Logger(MembershipCronService.name);

  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleMembershipAlertsAndExpiry() {
    const result = await this.subscriptionsService.processMembershipExpirationsAndAlerts();
    this.logger.log(
      `Membership cron completed: expiringSoon=${result.expiringSoon}, expired=${result.expired}`,
    );
  }
}
