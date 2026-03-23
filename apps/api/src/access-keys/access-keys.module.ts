import { Module } from '@nestjs/common';
import { AccessKeysService } from './access-keys.service';
import { AccessKeysController } from './access-keys.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret:
          configService.get<string>('JWT_SECRET') ||
          'super_secret_jwt_key_change_me',
        signOptions: { expiresIn: '1m' }, // Short expiration for QR codes
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AccessKeysController],
  providers: [AccessKeysService],
  exports: [AccessKeysService],
})
export class AccessKeysModule {}
