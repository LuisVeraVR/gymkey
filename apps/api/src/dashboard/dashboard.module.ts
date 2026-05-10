import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PlatformModule } from '../platform/platform.module';

@Module({
  imports: [PrismaModule, PlatformModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
