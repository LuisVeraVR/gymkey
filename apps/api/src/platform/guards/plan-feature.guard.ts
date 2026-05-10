import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PLATFORM_FEATURE_KEY } from '../decorators/require-feature.decorator';
import { PlatformFeature } from '../plan-limits';
import { PlatformService } from '../platform.service';

@Injectable()
export class PlatformFeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly platformService: PlatformService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.getAllAndOverride<PlatformFeature>(
      PLATFORM_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!feature) return true;
    const req = context.switchToHttp().getRequest();
    await this.platformService.assertFeatureEnabled(req.user?.tenantId, feature);
    return true;
  }
}
