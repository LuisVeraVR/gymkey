import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { UserRole, SubscriptionStatus } from '@prisma/client';

@Injectable()
export class AccessKeysService {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
  ) {}

  async generateKey(userId: string, tenantId: string) {
    const user: any = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('El usuario no está activo');
    }

    // Check subscription for MEMBERS
    if (user.role === UserRole.MEMBER) {
      if (
        !user.subscription ||
        user.subscription.status !== SubscriptionStatus.ACTIVE
      ) {
        throw new UnauthorizedException('Membresía vencida o inexistente');
      }
    }

    const payload = {
      sub: user.id,
      type: 'access_key',
      tenantId: user.tenantId,
      timestamp: Date.now(),
    };

    return {
      token: this.jwtService.sign(payload),
      expiresIn: 30, // seconds suggestion for frontend refresh
    };
  }

  async validateKey(token: string, adminTenantId: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token);

      if (payload.type !== 'access_key') {
        throw new BadRequestException(
          'Token inválido: No es una llave de acceso',
        );
      }

      if (payload.tenantId !== adminTenantId) {
        throw new UnauthorizedException(
          'Este usuario pertenece a otro gimnasio',
        );
      }

      const user: any = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('Usuario no existe');
      }

      if (!user.isActive) {
        return {
          valid: false,
          reason: 'Usuario INACTIVO o SUSPENDIDO',
          user: { name: user.name, email: user.email, photo: user.photo },
        };
      }

      if (user.role === UserRole.MEMBER) {
        if (!user.subscription) {
          return {
            valid: false,
            reason: 'Sin Membresía',
            user: { name: user.name, email: user.email, photo: user.photo },
          };
        }
        if (user.subscription.status !== SubscriptionStatus.ACTIVE) {
          return {
            valid: false,
            reason: `Membresía ${user.subscription.status}`,
            user: { name: user.name, email: user.email, photo: user.photo },
          };
        }
      }

      return {
        valid: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          photo: user.photo,
          status: user.isActive ? 'ACTIVE' : 'INACTIVE',
          subscription: user.subscription?.status || 'NONE',
        },
      };
    } catch (e) {
      return {
        valid: false,
        reason: 'Token expirado o inválido',
        error: e.message,
      };
    }
  }
}
