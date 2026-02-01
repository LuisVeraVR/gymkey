import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UsersService } from './users.service';
import { UserRole, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

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
  @Roles(UserRole.GYM_ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF)
  findAll(@Request() req: any) {
    return this.usersService.findAll(req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  @Roles(UserRole.GYM_ADMIN, UserRole.SUPER_ADMIN)
  async create(@Request() req: any, @Body() createUserDto: any) {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    
    const data: Prisma.UserCreateInput = {
      ...createUserDto,
      password: hashedPassword,
      tenant: { connect: { id: req.user.tenantId } },
    };
    
    // Prevent creating admins if not super admin (basic check)
    if (data.role === UserRole.SUPER_ADMIN && req.user.role !== UserRole.SUPER_ADMIN) {
        throw new ForbiddenException('Cannot create Super Admin');
    }

    return this.usersService.create(data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id')
  @Roles(UserRole.GYM_ADMIN, UserRole.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() updateUserDto: any) {
    return this.usersService.update(id, updateUserDto);
  }
}
