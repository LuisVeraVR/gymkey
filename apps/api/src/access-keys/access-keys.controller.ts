import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { AccessKeysService } from './access-keys.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('access-keys')
@UseGuards(JwtAuthGuard)
export class AccessKeysController {
  constructor(private readonly accessKeysService: AccessKeysService) {}

  // Endpoint for Mobile App to get the QR Token
  @Get('my-key')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.MEMBER,
    UserRole.COACH,
    UserRole.STAFF,
    UserRole.GYM_ADMIN,
    UserRole.SUPER_ADMIN,
  )
  async getMyKey(@Request() req: any) {
    return this.accessKeysService.generateKey(
      req.user.userId,
      req.user.tenantId,
    );
  }

  // Endpoint for Admin/Staff to validate the QR Token
  @Post('validate')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.STAFF,
    UserRole.GYM_ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.COACH,
  )
  async validateKey(@Request() req: any, @Body('token') token: string) {
    if (!token) {
      throw new UnauthorizedException('Token requerido');
    }
    return this.accessKeysService.validateKey(token, req.user.tenantId);
  }
}
