import { Global, Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { PlatformController } from './platform.controller';
import { PlatformCronService } from './platform-cron.service';
import { PlatformService } from './platform.service';
import { PlatformFeatureGuard } from './guards/plan-feature.guard';
import { PlatformLimitGuard } from './guards/plan-limit.guard';
import { TrialGuard } from './guards/trial.guard';

@Global()
@Module({
  imports: [NotificationsModule],
  controllers: [PlatformController],
  providers: [
    PlatformService,
    PlatformFeatureGuard,
    PlatformLimitGuard,
    TrialGuard,
    PlatformCronService,
  ],
  exports: [PlatformService, PlatformFeatureGuard, PlatformLimitGuard, TrialGuard],
})
export class PlatformModule {}
