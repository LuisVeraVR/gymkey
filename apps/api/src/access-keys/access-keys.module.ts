import { Module } from '@nestjs/common';
import { AccessKeysService } from './access-keys.service';
import { AccessKeysController } from './access-keys.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { PlatformModule } from '../platform/platform.module';

@Module({
  imports: [
    UsersModule,
    AuditLogsModule,
    PlatformModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret:
          configService.get<string>('JWT_SECRET') ||
          'super_secret_jwt_key_change_me',
        signOptions: { expiresIn: '1m' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AccessKeysController],
  providers: [AccessKeysService],
  exports: [AccessKeysService],
})
export class AccessKeysModule {}
