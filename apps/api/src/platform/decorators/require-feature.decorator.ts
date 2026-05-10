import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { PlatformFeature } from '../plan-limits';
import { PlatformFeatureGuard } from '../guards/plan-feature.guard';

export const PLATFORM_FEATURE_KEY = 'platform:feature';

export function RequireFeature(feature: PlatformFeature) {
  return applyDecorators(
    SetMetadata(PLATFORM_FEATURE_KEY, feature),
    UseGuards(PlatformFeatureGuard),
  );
}
