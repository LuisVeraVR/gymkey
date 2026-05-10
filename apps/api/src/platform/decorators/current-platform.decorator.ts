import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { PlatformRequestContext } from '../platform.types';

export const CurrentPlatform = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): PlatformRequestContext | null => {
    const req = ctx.switchToHttp().getRequest();
    return req.platformContext ?? null;
  },
);
