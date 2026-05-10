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
import { DiscountsService } from './discounts.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole, Prisma } from '@prisma/client';
import { RequireFeature } from '../platform/decorators/require-feature.decorator';

@Controller('discounts')
export class DiscountsController {
  constructor(private readonly discountsService: DiscountsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  @Roles(UserRole.GYM_ADMIN, UserRole.SUPER_ADMIN)
  @RequireFeature('discounts')
  async create(@Request() req: any, @Body() dto: CreateDiscountDto) {
    const { applicablePlanIds, ...rest } = dto;

    const data: Prisma.DiscountCreateInput = {
      ...rest,
      tenant: { connect: { id: req.user.tenantId } },
      plans: applicablePlanIds
        ? {
            connect: applicablePlanIds.map((id: string) => ({ id })),
          }
        : undefined,
    };

    return this.discountsService.create(data, req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Request() req: any) {
    return this.discountsService.findAll(req.user.tenantId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id')
  @Roles(UserRole.GYM_ADMIN, UserRole.SUPER_ADMIN)
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateDiscountDto,
  ) {
    const { applicablePlanIds, ...rest } = dto;

    const data: Prisma.DiscountUpdateInput = {
      ...rest,
    };

    if (applicablePlanIds) {
      data.plans = {
        set: applicablePlanIds.map((id: string) => ({ id })),
      };
    }

    return this.discountsService.update(id, data, req.user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  @Roles(UserRole.GYM_ADMIN, UserRole.SUPER_ADMIN)
  async remove(@Request() req: any, @Param('id') id: string) {
    return this.discountsService.remove(id, req.user.sub);
  }
}
