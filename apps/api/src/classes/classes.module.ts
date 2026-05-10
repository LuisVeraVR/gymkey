import { Module } from '@nestjs/common';
import { ClassesController } from './classes.controller';
import { ClassesService } from './classes.service';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { PlatformModule } from '../platform/platform.module';

@Module({
  imports: [AuditLogsModule, PlatformModule],
  controllers: [ClassesController],
  providers: [ClassesService],
  exports: [ClassesService],
})
export class ClassesModule {}
