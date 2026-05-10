import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import api from '../api';
import { fetchRuntimeSettings } from '../memberApi';

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

type PlatformSubscription = {
  plan: 'DEMO' | 'STARTER' | 'PRO' | 'BUSINESS';
  status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED';
  trialEndDate?: string | null;
  currentPeriodEnd?: string | null;
  limits: {
    features: Record<PlatformFeature, boolean> & {
      maxEmailsPerMonth: number;
      auditHistoryDays: number;
    };
  };
  billingAccount?: {
    id: string;
    name: string;
    tenants: Array<{ id: string; name: string; slug: string }>;
  } | null;
} | null;

type RuntimeSettings = {
  name: string;
  offlineToleranceMinutes: number;
  showPublicPortal: boolean;
  branding: {
    primaryColor?: string;
    accentColor?: string;
    appName?: string;
  } | null;
} | null;

type GymContextValue = {
  platform: PlatformSubscription;
  runtime: RuntimeSettings;
  loading: boolean;
  refreshGymState: () => Promise<void>;
  hasFeature: (feature: PlatformFeature) => boolean;
  isBillingBlocked: boolean;
  isTrialing: boolean;
  gymDisplayName: string;
};

const GymContext = createContext<GymContextValue | null>(null);

export function GymProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const { setBranding } = useTheme();
  const [platform, setPlatform] = useState<PlatformSubscription>(null);
  const [runtime, setRuntime] = useState<RuntimeSettings>(null);
  const [loading, setLoading] = useState(false);

  const refreshGymState = useCallback(async () => {
    if (!token) {
      setPlatform(null);
      setRuntime(null);
      return;
    }
    setLoading(true);
    try {
      const [platformRes, runtimeRes] = await Promise.all([
        api.get<PlatformSubscription>('/platform/subscription'),
        fetchRuntimeSettings().catch(() => ({
          name: 'GymKey',
          offlineToleranceMinutes: 5,
          showPublicPortal: false,
          branding: null,
        })),
      ]);
      setPlatform(platformRes.data);
      setRuntime(runtimeRes);
      setBranding(runtimeRes.branding);
    } catch {
      setPlatform(null);
      setRuntime(null);
      setBranding(null);
    } finally {
      setLoading(false);
    }
  }, [token, setBranding]);

  useEffect(() => {
    void refreshGymState();
  }, [refreshGymState]);

  const value = useMemo<GymContextValue>(() => {
    const isBillingBlocked = !!platform && platform.plan !== 'DEMO' && ['PAST_DUE', 'CANCELED', 'EXPIRED'].includes(platform.status);
    return {
      platform,
      runtime,
      loading,
      refreshGymState,
      hasFeature: (feature) => Boolean(platform?.limits?.features?.[feature]),
      isBillingBlocked,
      isTrialing: platform?.status === 'TRIALING',
      gymDisplayName:
        runtime?.branding?.appName ||
        runtime?.name ||
        platform?.billingAccount?.tenants?.[0]?.name ||
        platform?.billingAccount?.name ||
        'Tu gimnasio',
    };
  }, [platform, runtime, loading, refreshGymState]);

  return <GymContext.Provider value={value}>{children}</GymContext.Provider>;
}

export function useGym() {
  const ctx = useContext(GymContext);
  if (!ctx) throw new Error('useGym debe usarse dentro de GymProvider');
  return ctx;
}
