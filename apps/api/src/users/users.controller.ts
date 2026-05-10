import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UsersService } from './users.service';
import { UserRole } from '@prisma/client';
import { CheckLimit } from '../platform/decorators/check-limit.decorator';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req: any) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  @Roles(UserRole.GYM_ADMIN, UserRole.SUPER_ADMIN)
  findAll(@Request() req: any) {
    return this.usersService.findAll(req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post('invite')
  @Roles(UserRole.GYM_ADMIN, UserRole.SUPER_ADMIN)
  invite(@Request() req: any, @Body() body: any) {
    return this.usersService.inviteMember({
      tenantId: req.user.tenantId,
      actorId: req.user.sub || req.user.userId || req.user.id,
      actorName: req.user.name || req.user.email,
      memberName: body.name,
      email: body.email,
      planId: body.planId || undefined,
      temporaryPassword: body.temporaryPassword || undefined,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  @Roles(UserRole.GYM_ADMIN, UserRole.SUPER_ADMIN)
  @CheckLimit('maxMembers', 'role')
  @CheckLimit('maxStaff', 'role')
  async create(@Request() req: any, @Body() createUserDto: any) {
    // Prevent creating admins if not super admin (basic check)
    if (
      createUserDto.role === UserRole.SUPER_ADMIN &&
      req.user.role !== UserRole.SUPER_ADMIN
    ) {
      throw new ForbiddenException('Cannot create Super Admin');
    }

    return this.usersService.createForTenant({
      tenantId: req.user.tenantId,
      name: createUserDto.name,
      email: createUserDto.email,
      password: createUserDto.password,
      role: createUserDto.role,
      isActive: createUserDto.isActive,
      mustChangePassword:
        createUserDto.mustChangePassword ??
        createUserDto.role === UserRole.MEMBER,
      planId: createUserDto.planId || undefined,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id')
  @Roles(UserRole.GYM_ADMIN, UserRole.SUPER_ADMIN)
  async update(@Param('id') id: string, @Body() updateUserDto: any) {
    return this.usersService.update(id, updateUserDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  @Roles(UserRole.GYM_ADMIN, UserRole.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/password-change-status')
  @Roles(UserRole.GYM_ADMIN, UserRole.SUPER_ADMIN)
  async updatePasswordChangeStatus(
    @Param('id') id: string,
    @Body('enable') enable: boolean,
  ) {
    return this.usersService.enablePasswordChange(id, enable);
  }
}
