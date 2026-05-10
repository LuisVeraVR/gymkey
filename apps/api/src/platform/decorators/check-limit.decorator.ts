import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { PlatformLimitCheck } from '../platform.types';
import { PlatformLimitKey } from '../plan-limits';
import { PlatformLimitGuard } from '../guards/plan-limit.guard';

export const PLATFORM_LIMIT_KEY = 'platform:limit';

export function CheckLimit(limit: PlatformLimitKey, roleField?: string) {
  const payload: PlatformLimitCheck = { limit, role: roleField };
  return applyDecorators(
    SetMetadata(PLATFORM_LIMIT_KEY, payload),
    UseGuards(PlatformLimitGuard),
  );
}
