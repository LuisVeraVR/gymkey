import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { PlansService } from './plans.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole, Prisma } from '@prisma/client';

@Controller('plans')
export class PlansController {
  constructor(
    private readonly plansService: PlansService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  @Roles(UserRole.GYM_ADMIN, UserRole.SUPER_ADMIN)
  async create(@Request() req: any, @Body() createPlanDto: any) {
    const { durationDays, ...rest } = createPlanDto;
    const data: Prisma.PlanCreateInput = {
      ...rest,
      duration: durationDays || rest.duration || 30,
      tenant: { connect: { id: req.user.tenantId } },
    };
    return this.plansService.create(data);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Request() req: any) {
    return this.plansService.findAll(req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  @Roles(UserRole.GYM_ADMIN, UserRole.SUPER_ADMIN)
  async remove(@Request() req: any, @Param('id') id: string) {
    return this.plansService.remove(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id')
  @Roles(UserRole.GYM_ADMIN, UserRole.SUPER_ADMIN)
  async update(@Request() req: any, @Param('id') id: string, @Body() updatePlanDto: any) {
    const { durationDays, ...rest } = updatePlanDto;
    const data: Prisma.PlanUpdateInput = {
      ...rest,
    };
    if (durationDays !== undefined) {
      data.duration = durationDays;
    }
    return this.plansService.update(id, data);
  }
}
