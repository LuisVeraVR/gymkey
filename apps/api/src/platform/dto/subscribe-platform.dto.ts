import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PlatformPlan } from '@prisma/client';

export class SubscribePlatformDto {
  @IsEnum(PlatformPlan)
  plan: PlatformPlan;

  @IsOptional()
  @IsString()
  billingAccountId?: string;
}
