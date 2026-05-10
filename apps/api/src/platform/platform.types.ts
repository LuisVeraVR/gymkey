import type {
  PlatformBillingAccount,
  PlatformPlan,
  PlatformSubscription,
  PlatformSubscriptionStatus,
} from '@prisma/client';
import type {
  PlanLimits,
  PlatformFeature,
  PlatformLimitKey,
} from './plan-limits';

export type PlatformBillingAccountWithRelations = PlatformBillingAccount & {
  subscription: PlatformSubscription | null;
  tenants: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
};

export type PlatformRequestContext = {
  billingAccount: PlatformBillingAccountWithRelations | null;
  subscription: PlatformSubscription | null;
  plan: PlatformPlan;
  status: PlatformSubscriptionStatus;
  limits: PlanLimits;
};

export type UsageMetric = {
  current: number;
  max: number;
};

export type PlatformUsage = {
  members: UsageMetric;
  staff: UsageMetric;
  routines: UsageMetric;
  classes: UsageMetric;
  locations: UsageMetric;
};

export type PlatformFeatureCheck = {
  feature: PlatformFeature;
  requiredPlan: PlatformPlan;
};

export type PlatformLimitCheck = {
  limit: PlatformLimitKey;
  role?: string;
};
