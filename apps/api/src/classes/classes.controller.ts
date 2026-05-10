import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ClassesService } from './classes.service';
import { CreateGymClassDto } from './dto/create-gym-class.dto';
import { UpdateGymClassDto } from './dto/update-gym-class.dto';
import { BookClassDto } from './dto/book-class.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { RequireFeature } from '../platform/decorators/require-feature.decorator';
import { CheckLimit } from '../platform/decorators/check-limit.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  private actorFromReq(req: any) {
    return {
      userId: req.user?.sub || req.user?.userId || req.user?.id,
      tenantId: req.user?.tenantId ?? null,
      role: req.user?.role,
    };
  }

  @Post()
  @Roles(UserRole.GYM_ADMIN, UserRole.SUPER_ADMIN)
  @RequireFeature('classBookings')
  @CheckLimit('maxClasses')
  create(@Body() dto: CreateGymClassDto, @Request() req: any) {
    return this.classesService.create(dto, this.actorFromReq(req));
  }

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.GYM_ADMIN,
    UserRole.STAFF,
    UserRole.COACH,
    UserRole.MEMBER,
  )
  @RequireFeature('classBookings')
  findAll(@Request() req: any) {
    return this.classesService.findAll(req.user.tenantId ?? null);
  }

  @Get('my-bookings')
  @Roles(UserRole.MEMBER)
  @RequireFeature('classBookings')
  myBookings(@Request() req: any) {
    return this.classesService.findMyBookings(this.actorFromReq(req));
  }

  @Post(':classId/book')
  @Roles(UserRole.MEMBER)
  @RequireFeature('classBookings')
  book(
    @Param('classId') classId: string,
    @Body() dto: BookClassDto,
    @Request() req: any,
  ) {
    return this.classesService.bookClass(classId, dto.date, this.actorFromReq(req));
  }

  @Delete(':classId/book/:date')
  @Roles(UserRole.MEMBER)
  @RequireFeature('classBookings')
  cancel(
    @Param('classId') classId: string,
    @Param('date') date: string,
    @Request() req: any,
  ) {
    return this.classesService.cancelBooking(classId, date, this.actorFromReq(req));
  }

  @Get(':classId/bookings')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GYM_ADMIN, UserRole.STAFF, UserRole.COACH)
  @RequireFeature('classBookings')
  listBookings(
    @Param('classId') classId: string,
    @Query('date') date: string,
    @Request() req: any,
  ) {
    return this.classesService.listBookingsForClass(
      classId,
      date,
      this.actorFromReq(req),
    );
  }

  @Patch(':classId/bookings/:bookingId/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.GYM_ADMIN, UserRole.STAFF, UserRole.COACH)
  @RequireFeature('classBookings')
  updateStatus(
    @Param('classId') classId: string,
    @Param('bookingId') bookingId: string,
    @Body() dto: UpdateBookingStatusDto,
    @Request() req: any,
  ) {
    return this.classesService.updateBookingStatus(
      classId,
      bookingId,
      dto.status,
      this.actorFromReq(req),
    );
  }

  @Get(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.GYM_ADMIN,
    UserRole.STAFF,
    UserRole.COACH,
    UserRole.MEMBER,
  )
  @RequireFeature('classBookings')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.classesService.findOne(id, req.user.tenantId ?? null);
  }

  @Patch(':id')
  @Roles(UserRole.GYM_ADMIN, UserRole.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateGymClassDto, @Request() req: any) {
    return this.classesService.update(id, dto, this.actorFromReq(req));
  }

  @Delete(':id')
  @Roles(UserRole.GYM_ADMIN, UserRole.SUPER_ADMIN)
  remove(@Param('id') id: string, @Request() req: any) {
    return this.classesService.remove(id, this.actorFromReq(req));
  }
}
