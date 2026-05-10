'use client';

import api from '@/lib/api';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './auth-context';

type PlatformFeature =
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

type UsageMetric = { current: number; max: number };

type PlatformUsage = {
  members: UsageMetric;
  staff: UsageMetric;
  routines: UsageMetric;
  classes: UsageMetric;
  locations: UsageMetric;
};

type PlatformSubscriptionData = {
  id?: string;
  plan: 'DEMO' | 'STARTER' | 'PRO' | 'BUSINESS';
  status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED';
  trialStartDate?: string | null;
  trialEndDate?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  limits: {
    maxMembers: number;
    maxStaff: number;
    maxRoutines: number;
    maxClasses: number;
    maxLocations: number;
    features: Record<PlatformFeature, boolean> & {
      maxEmailsPerMonth: number;
      auditHistoryDays: number;
    };
  };
  billingAccount?: {
    id: string;
    name: string;
    email?: string | null;
    hasUsedTrial: boolean;
    tenantLimit: number;
    tenants: Array<{ id: string; name: string; slug: string }>;
  } | null;
};

type PlatformContextValue = {
  subscription: PlatformSubscriptionData | null;
  usage: PlatformUsage | null;
  loading: boolean;
  refreshPlatform: () => Promise<void>;
  hasFeature: (feature: PlatformFeature) => boolean;
  isDemo: boolean;
  isTrialing: boolean;
  isExpired: boolean;
  isBillingBlocked: boolean;
  daysLeftInTrial: number | null;
  canAccessRoute: (pathname: string) => boolean;
};

const PlatformContext = createContext<PlatformContextValue | undefined>(undefined);

function diffDays(endDate?: string | null) {
  if (!endDate) return null;
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return null;
  return Math.max(0, Math.ceil((end.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
}

const ROUTE_FEATURES: Record<string, PlatformFeature> = {
  '/discounts': 'discounts',
  '/classes': 'classBookings',
};

export function PlatformProvider({
  children,
  initialSubscription,
  initialUsage,
}: {
  children: React.ReactNode;
  initialSubscription: PlatformSubscriptionData | null;
  initialUsage: PlatformUsage | null;
}) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<PlatformSubscriptionData | null>(
    initialSubscription,
  );
  const [usage, setUsage] = useState<PlatformUsage | null>(initialUsage);
  const [loading, setLoading] = useState(false);

  const refreshPlatform = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [subscriptionRes, usageRes] = await Promise.all([
        api.get<PlatformSubscriptionData>('/platform/subscription'),
        api.get<PlatformUsage>('/platform/usage'),
      ]);
      setSubscription(subscriptionRes.data);
      setUsage(usageRes.data);
    } catch {
      setSubscription(null);
      setUsage(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && !initialSubscription) {
      void refreshPlatform();
    }
  }, [user, initialSubscription]);

  const value = useMemo<PlatformContextValue>(() => {
    const plan = subscription?.plan ?? 'DEMO';
    const status = subscription?.status ?? 'ACTIVE';
    const isDemo = plan === 'DEMO';
    const isTrialing = status === 'TRIALING';
    const isExpired = status === 'EXPIRED';
    const isBillingBlocked = !isDemo && ['EXPIRED', 'CANCELED', 'PAST_DUE'].includes(status);
    const hasFeature = (feature: PlatformFeature) =>
      Boolean(subscription?.limits?.features?.[feature]);
    const canAccessRoute = (pathname: string) => {
      if (pathname === '/billing') return true;
      if (isBillingBlocked) {
        return pathname === '/settings' || pathname === '/dashboard';
      }
      const feature = Object.entries(ROUTE_FEATURES).find(([route]) =>
        pathname === route || pathname.startsWith(`${route}/`),
      )?.[1];
      return feature ? hasFeature(feature) : true;
    };

    return {
      subscription,
      usage,
      loading,
      refreshPlatform,
      hasFeature,
      isDemo,
      isTrialing,
      isExpired,
      isBillingBlocked,
      daysLeftInTrial: diffDays(subscription?.trialEndDate),
      canAccessRoute,
    };
  }, [subscription, usage, loading]);

  return (
    <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>
  );
}

export function usePlatform() {
  const context = useContext(PlatformContext);
  if (!context) {
    throw new Error('usePlatform must be used within PlatformProvider');
  }
  return context;
}
