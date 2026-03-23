import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoutineDto } from './dto/create-routine.dto';

@Injectable()
export class RoutinesService {
  constructor(private prisma: PrismaService) {}

  create(
    createRoutineDto: CreateRoutineDto,
    coachId: string,
    tenantId: string,
  ) {
    // Validate JSON content if necessary
    if (
      !createRoutineDto.content ||
      typeof createRoutineDto.content !== 'object'
    ) {
      throw new Error('Invalid routine content structure');
    }

    return this.prisma.routine.create({
      data: {
        ...createRoutineDto,
        coachId,
        tenantId,
      },
      include: { user: true },
    });
  }

  findAll(tenantId: string) {
    return this.prisma.routine.findMany({
      where: { tenantId },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  findByCoach(coachId: string) {
    return this.prisma.routine.findMany({
      where: { coachId },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  findByUser(userId: string) {
    return this.prisma.routine.findMany({
      where: { userId },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.routine.findUnique({
      where: { id },
      include: { user: true },
    });
  }

  update(id: string, data: any) {
    return this.prisma.routine.update({
      where: { id },
      data,
    });
  }

  remove(id: string) {
    return this.prisma.routine.delete({
      where: { id },
    });
  }
}
