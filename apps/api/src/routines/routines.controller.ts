import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { RoutinesService } from './routines.service';
import { CreateRoutineDto } from './dto/create-routine.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('routines')
export class RoutinesController {
  constructor(private readonly routinesService: RoutinesService) {}

  @Post()
  @Roles(UserRole.GYM_ADMIN, UserRole.SUPER_ADMIN, UserRole.COACH)
  create(@Request() req: any, @Body() createRoutineDto: CreateRoutineDto) {
    return this.routinesService.create(createRoutineDto, req.user.id, req.user.tenantId);
  }

  @Get()
  @Roles(UserRole.GYM_ADMIN, UserRole.SUPER_ADMIN, UserRole.COACH, UserRole.STAFF)
  findAll(@Request() req: any) {
    return this.routinesService.findAll(req.user.tenantId);
  }

  @Get('my-routines')
  @Roles(UserRole.MEMBER)
  findMyRoutines(@Request() req: any) {
    return this.routinesService.findByUser(req.user.id);
  }

  @Get('coach/:coachId')
  @Roles(UserRole.GYM_ADMIN, UserRole.SUPER_ADMIN)
  findByCoach(@Param('coachId') coachId: string) {
    return this.routinesService.findByCoach(coachId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.routinesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.GYM_ADMIN, UserRole.SUPER_ADMIN, UserRole.COACH)
  update(@Param('id') id: string, @Body() updateRoutineDto: any) {
    return this.routinesService.update(id, updateRoutineDto);
  }

  @Delete(':id')
  @Roles(UserRole.GYM_ADMIN, UserRole.SUPER_ADMIN, UserRole.COACH)
  remove(@Param('id') id: string) {
    return this.routinesService.remove(id);
  }
}
