import { IsEnum } from 'class-validator';
import { PlatformPlan } from '@prisma/client';

export class StartTrialDto {
  @IsEnum(PlatformPlan)
  plan: PlatformPlan;
}
