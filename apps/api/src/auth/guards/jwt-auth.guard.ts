import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../public.decorator';
import { PlatformService } from '../../platform/platform.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private platformService: PlatformService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    const activated = await super.canActivate(context);
    if (!activated) {
      return activated;
    }
    const req = context.switchToHttp().getRequest();
    const platformContext = await this.platformService.assertTenantAccess(
      req.user?.tenantId,
    );
    req.platformContext = platformContext;
    req.user.platformPlan = platformContext?.plan ?? null;
    req.user.planLimits = platformContext?.limits ?? null;
    req.user.platformStatus = platformContext?.status ?? null;
    req.user.billingAccountId = platformContext?.billingAccount?.id ?? null;
    return true;
  }
}
