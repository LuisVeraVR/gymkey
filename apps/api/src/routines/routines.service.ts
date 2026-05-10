import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateRoutineDto } from './dto/create-routine.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class RoutinesService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async create(
    createRoutineDto: CreateRoutineDto,
    coachId: string,
    creatorRole: UserRole,
    tenantId: string | null,
  ) {
    // Validate JSON content if necessary
    if (
      !createRoutineDto.content ||
      typeof createRoutineDto.content !== 'object'
    ) {
      throw new BadRequestException('Estructura de rutina inválida');
    }
    const targetUserId =
      creatorRole === UserRole.MEMBER ? coachId : createRoutineDto.userId;
    if (!targetUserId) {
      throw new BadRequestException('userId es obligatorio');
    }

    let resolvedTenantId = tenantId;
    if (!resolvedTenantId) {
      const owner = await this.prisma.user.findUnique({
        where: { id: targetUserId },
        select: { tenantId: true },
      });
      resolvedTenantId = owner?.tenantId ?? null;
    }
    if (!resolvedTenantId) {
      throw new BadRequestException('No se pudo determinar el gimnasio del usuario');
    }

    const routine = await this.prisma.routine.create({
      data: {
        ...createRoutineDto,
        userId: targetUserId,
        coachId,
        tenantId: resolvedTenantId,
      },
      include: { user: true },
    });

    try {
      await this.notifications.createAndEmit({
        userId: targetUserId,
        tenantId: resolvedTenantId,
        title: 'Nueva rutina',
        message: `Nueva rutina asignada: ${routine.name}`,
        type: 'info',
        metadata: { routineId: routine.id },
      });
    } catch {
      /* no bloquear creación */
    }

    return routine;
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

  async update(
    id: string,
    data: any,
    actorId: string,
    actorRole: UserRole,
  ) {
    const routine = await this.prisma.routine.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });
    if (!routine) {
      throw new BadRequestException('Rutina no encontrada');
    }
    if (actorRole === UserRole.MEMBER && routine.userId !== actorId) {
      throw new ForbiddenException('No puedes modificar esta rutina');
    }
    return this.prisma.routine.update({
      where: { id },
      data,
    });
  }

  async remove(id: string, actorId: string, actorRole: UserRole) {
    const routine = await this.prisma.routine.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });
    if (!routine) {
      throw new BadRequestException('Rutina no encontrada');
    }
    if (actorRole === UserRole.MEMBER && routine.userId !== actorId) {
      throw new ForbiddenException('No puedes eliminar esta rutina');
    }
    return this.prisma.routine.delete({
      where: { id },
    });
  }
}
