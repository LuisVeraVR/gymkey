import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { RoutinesService } from './routines.service';
import { CreateRoutineDto } from './dto/create-routine.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { CheckLimit } from '../platform/decorators/check-limit.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('routines')
export class RoutinesController {
  constructor(private readonly routinesService: RoutinesService) {}

  @Post()
  @Roles(UserRole.GYM_ADMIN, UserRole.SUPER_ADMIN, UserRole.COACH, UserRole.MEMBER)
  @CheckLimit('maxRoutines')
  create(@Request() req: any, @Body() createRoutineDto: CreateRoutineDto) {
    return this.routinesService.create(
      createRoutineDto,
      req.user.id,
      req.user.role,
      req.user.tenantId,
    );
  }

  @Get()
  @Roles(
    UserRole.GYM_ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.COACH,
    UserRole.STAFF,
  )
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
  @Roles(UserRole.GYM_ADMIN, UserRole.SUPER_ADMIN, UserRole.COACH, UserRole.MEMBER)
  update(@Request() req: any, @Param('id') id: string, @Body() updateRoutineDto: any) {
    return this.routinesService.update(id, updateRoutineDto, req.user.id, req.user.role);
  }

  @Delete(':id')
  @Roles(UserRole.GYM_ADMIN, UserRole.SUPER_ADMIN, UserRole.COACH, UserRole.MEMBER)
  remove(@Request() req: any, @Param('id') id: string) {
    return this.routinesService.remove(id, req.user.id, req.user.role);
  }
}
