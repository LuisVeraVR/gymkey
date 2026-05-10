import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PLATFORM_LIMIT_KEY } from '../decorators/check-limit.decorator';
import { PlatformService } from '../platform.service';
import type { PlatformLimitCheck } from '../platform.types';

@Injectable()
export class PlatformLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly platformService: PlatformService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata = this.reflector.getAllAndOverride<PlatformLimitCheck>(
      PLATFORM_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!metadata) return true;
    const req = context.switchToHttp().getRequest();
    const bodyRole =
      metadata.role && req.body && typeof req.body[metadata.role] === 'string'
        ? req.body[metadata.role]
        : undefined;
    const current = await this.platformService.getLimitUsageValue(
      req.user?.tenantId,
      metadata.limit,
      bodyRole,
    );
    await this.platformService.assertLimitAvailable(
      req.user?.tenantId,
      metadata.limit,
      current,
    );
    return true;
  }
}
