import {
  PlatformPlan,
  PlatformSubscriptionStatus,
  UserRole,
} from '@prisma/client';

export type PlatformFeature =
  | 'nfcAccess'
  | 'onlinePayments'
  | 'classBookings'
  | 'advancedDashboard'
  | 'publicPortal'
  | 'csvExport'
  | 'pdfExport'
  | 'emailNotifications'
  | 'discounts'
  | 'customBranding'
  | 'whiteLabel'
  | 'apiAccess'
  | 'webhooks';

export type PlatformLimitKey =
  | 'maxMembers'
  | 'maxStaff'
  | 'maxRoutines'
  | 'maxClasses'
  | 'maxLocations';

export type PlanLimits = {
  maxMembers: number;
  maxStaff: number;
  maxRoutines: number;
  maxClasses: number;
  maxLocations: number;
  features: {
    nfcAccess: boolean;
    onlinePayments: boolean;
    classBookings: boolean;
    advancedDashboard: boolean;
    publicPortal: boolean;
    csvExport: boolean;
    pdfExport: boolean;
    emailNotifications: boolean;
    maxEmailsPerMonth: number;
    discounts: boolean;
    customBranding: boolean;
    whiteLabel: boolean;
    apiAccess: boolean;
    webhooks: boolean;
    auditHistoryDays: number;
  };
};

export type PlatformCatalogEntry = {
  plan: PlatformPlan;
  name: string;
  priceUsd: number;
  priceCop: number;
  trialDays: number;
  description: string;
  idealFor: string;
  limits: PlanLimits;
};

export const PLAN_LIMITS: Record<PlatformPlan, PlanLimits> = {
  [PlatformPlan.DEMO]: {
    maxMembers: 5,
    maxStaff: 1,
    maxRoutines: 3,
    maxClasses: 0,
    maxLocations: 1,
    features: {
      nfcAccess: false,
      onlinePayments: false,
      classBookings: false,
      advancedDashboard: false,
      publicPortal: false,
      csvExport: false,
      pdfExport: false,
      emailNotifications: false,
      maxEmailsPerMonth: 0,
      discounts: false,
      customBranding: false,
      whiteLabel: false,
      apiAccess: false,
      webhooks: false,
      auditHistoryDays: 7,
    },
  },
  [PlatformPlan.STARTER]: {
    maxMembers: 50,
    maxStaff: 2,
    maxRoutines: 20,
    maxClasses: 0,
    maxLocations: 1,
    features: {
      nfcAccess: false,
      onlinePayments: false,
      classBookings: false,
      advancedDashboard: false,
      publicPortal: false,
      csvExport: true,
      pdfExport: false,
      emailNotifications: false,
      maxEmailsPerMonth: 0,
      discounts: false,
      customBranding: false,
      whiteLabel: false,
      apiAccess: false,
      webhooks: false,
      auditHistoryDays: 30,
    },
  },
  [PlatformPlan.PRO]: {
    maxMembers: 300,
    maxStaff: 5,
    maxRoutines: -1,
    maxClasses: 20,
    maxLocations: 1,
    features: {
      nfcAccess: true,
      onlinePayments: true,
      classBookings: true,
      advancedDashboard: true,
      publicPortal: true,
      csvExport: true,
      pdfExport: true,
      emailNotifications: true,
      maxEmailsPerMonth: 500,
      discounts: true,
      customBranding: true,
      whiteLabel: false,
      apiAccess: false,
      webhooks: false,
      auditHistoryDays: -1,
    },
  },
  [PlatformPlan.BUSINESS]: {
    maxMembers: -1,
    maxStaff: -1,
    maxRoutines: -1,
    maxClasses: -1,
    maxLocations: 3,
    features: {
      nfcAccess: true,
      onlinePayments: true,
      classBookings: true,
      advancedDashboard: true,
      publicPortal: true,
      csvExport: true,
      pdfExport: true,
      emailNotifications: true,
      maxEmailsPerMonth: -1,
      discounts: true,
      customBranding: true,
      whiteLabel: true,
      apiAccess: true,
      webhooks: true,
      auditHistoryDays: -1,
    },
  },
};

export const PLATFORM_PLAN_CATALOG: Record<PlatformPlan, PlatformCatalogEntry> = {
  [PlatformPlan.DEMO]: {
    plan: PlatformPlan.DEMO,
    name: 'Demo',
    priceUsd: 0,
    priceCop: 0,
    trialDays: 0,
    description: 'Sandbox permanente para explorar GymKey con datos de ejemplo.',
    idealFor: 'Explorar la plataforma antes de iniciar una prueba.',
    limits: PLAN_LIMITS[PlatformPlan.DEMO],
  },
  [PlatformPlan.STARTER]: {
    plan: PlatformPlan.STARTER,
    name: 'Starter',
    priceUsd: 29,
    priceCop: 120000,
    trialDays: 15,
    description: 'Digitalización base para gimnasios pequeños.',
    idealFor: 'Gimnasios con menos de 50 miembros activos.',
    limits: PLAN_LIMITS[PlatformPlan.STARTER],
  },
  [PlatformPlan.PRO]: {
    plan: PlatformPlan.PRO,
    name: 'Pro',
    priceUsd: 59,
    priceCop: 240000,
    trialDays: 15,
    description: 'Control operativo completo para gimnasios medianos.',
    idealFor: 'Gimnasios medianos que necesitan pagos online, clases y branding.',
    limits: PLAN_LIMITS[PlatformPlan.PRO],
  },
  [PlatformPlan.BUSINESS]: {
    plan: PlatformPlan.BUSINESS,
    name: 'Business',
    priceUsd: 99,
    priceCop: 400000,
    trialDays: 15,
    description: 'Operación multi-sede con white-label e integraciones.',
    idealFor: 'Cadenas, franquicias y gimnasios premium.',
    limits: PLAN_LIMITS[PlatformPlan.BUSINESS],
  },
};

const PLAN_ORDER: PlatformPlan[] = [
  PlatformPlan.DEMO,
  PlatformPlan.STARTER,
  PlatformPlan.PRO,
  PlatformPlan.BUSINESS,
];

export function comparePlans(a: PlatformPlan, b: PlatformPlan) {
  return PLAN_ORDER.indexOf(a) - PLAN_ORDER.indexOf(b);
}

export function getRequiredPlanForFeature(
  feature: PlatformFeature,
): PlatformPlan {
  return (
    ([PlatformPlan.DEMO, PlatformPlan.STARTER, PlatformPlan.PRO, PlatformPlan.BUSINESS]
      .find((plan) => PLAN_LIMITS[plan].features[feature]) as PlatformPlan) ||
    PlatformPlan.BUSINESS
  );
}

export function getRequiredPlanForLimit(limit: PlatformLimitKey): PlatformPlan {
  return (
    ([PlatformPlan.DEMO, PlatformPlan.STARTER, PlatformPlan.PRO, PlatformPlan.BUSINESS]
      .find((plan) => PLAN_LIMITS[plan][limit] !== 0) as PlatformPlan) ||
    PlatformPlan.BUSINESS
  );
}

export function isUnlimited(value: number) {
  return value < 0;
}

export function isStaffRole(role?: UserRole | string | null) {
  return (
    role === UserRole.GYM_ADMIN ||
    role === UserRole.STAFF ||
    role === UserRole.COACH
  );
}

export function allowsStatus(
  status: PlatformSubscriptionStatus,
  plan: PlatformPlan,
) {
  if (plan === PlatformPlan.DEMO) return true;
  return (
    status === PlatformSubscriptionStatus.ACTIVE ||
    status === PlatformSubscriptionStatus.TRIALING
  );
}
