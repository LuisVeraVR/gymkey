import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { PlatformService } from '../platform.service';

@Injectable()
export class TrialGuard implements CanActivate {
  constructor(private readonly platformService: PlatformService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    await this.platformService.assertTenantAccess(req.user?.tenantId);
    return true;
  }
}
