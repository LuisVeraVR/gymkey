'use client';

import api from '@/lib/api';
import { usePlatform } from '@/context/platform-context';
import { useAuth } from '@/context/auth-context';
import { useState } from 'react';

const PLAN_CATALOG = [
  {
    plan: 'STARTER',
    name: 'Starter',
    usd: 29,
    cop: 120000,
    features: ['50 miembros activos', '2 staff', 'CSV', 'Pagos manuales'],
  },
  {
    plan: 'PRO',
    name: 'Pro',
    usd: 59,
    cop: 240000,
    features: ['300 miembros activos', 'NFC', 'Clases y reservas', 'Branding'],
  },
  {
    plan: 'BUSINESS',
    name: 'Business',
    usd: 99,
    cop: 400000,
    features: ['Multi-sede', 'White-label', 'API pública', 'Sin límites'],
  },
] as const;

export default function BillingPage() {
  const { user } = useAuth();
  const { subscription, usage, refreshPlatform, daysLeftInTrial } = usePlatform();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);

  const onChoosePlan = async (plan: 'STARTER' | 'PRO' | 'BUSINESS') => {
    setLoadingPlan(plan);
    try {
      if (subscription?.plan === 'DEMO') {
        await api.post('/platform/trial/start', { plan });
      } else {
        await api.post('/platform/subscribe', { plan });
      }
      await refreshPlatform();
    } finally {
      setLoadingPlan(null);
    }
  };

  const onCancel = async () => {
    setCanceling(true);
    try {
      await api.post('/platform/cancel');
      await refreshPlatform();
    } finally {
      setCanceling(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Facturación</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Gestiona el plan SaaS de tu gimnasio, el estado del trial y el uso actual frente a los límites.
        </p>
      </div>

      <section className="rounded-3xl border border-border/60 bg-card p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Plan actual</p>
            <h2 className="mt-1 text-2xl font-bold text-foreground">{subscription?.plan ?? 'DEMO'}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Estado: <span className="font-medium text-foreground">{subscription?.status ?? 'ACTIVE'}</span>
            </p>
            {subscription?.status === 'TRIALING' && (
              <p className="mt-1 text-sm text-primary">
                Te quedan {daysLeftInTrial ?? 0} días de prueba.
              </p>
            )}
            {subscription?.currentPeriodEnd && (
              <p className="mt-1 text-sm text-muted-foreground">
                Próximo corte: {new Date(subscription.currentPeriodEnd).toLocaleDateString('es-CO')}
              </p>
            )}
          </div>
          <button
            onClick={onCancel}
            disabled={canceling || !subscription || subscription.plan === 'DEMO'}
            className="rounded-xl border border-destructive/30 px-4 py-2 text-sm font-medium text-destructive disabled:opacity-50"
          >
            {canceling ? 'Cancelando...' : 'Cancelar suscripción'}
          </button>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {PLAN_CATALOG.map((plan) => {
          const isCurrent = subscription?.plan === plan.plan;
          return (
            <div
              key={plan.plan}
              className={`rounded-3xl border p-6 ${isCurrent ? 'border-primary bg-primary/5' : 'border-border/60 bg-card'}`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                {isCurrent && (
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    Plan actual
                  </span>
                )}
              </div>
              <p className="mt-4 text-3xl font-bold text-foreground">
                ${plan.usd} <span className="text-sm font-medium text-muted-foreground">USD/mes</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                ~ ${plan.cop.toLocaleString('es-CO')} COP
              </p>
              <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
                {plan.features.map((feature) => (
                  <li key={feature}>• {feature}</li>
                ))}
              </ul>
              <button
                disabled={isCurrent || loadingPlan === plan.plan}
                onClick={() => onChoosePlan(plan.plan)}
                className="mt-6 w-full rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {isCurrent ? 'Plan actual' : loadingPlan === plan.plan ? 'Procesando...' : subscription?.plan === 'DEMO' ? 'Iniciar trial' : 'Elegir plan'}
              </button>
            </div>
          );
        })}
      </section>

      <section className="rounded-3xl border border-border/60 bg-card p-6">
        <h2 className="text-xl font-bold text-foreground">Uso actual</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {usage && ([
            ['Miembros', usage.members],
            ['Staff', usage.staff],
            ['Rutinas', usage.routines],
            ['Clases', usage.classes],
          ] as const).map(([label, metric]) => (
            <div key={label} className="rounded-2xl border border-border/50 bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {metric.current}
                <span className="text-sm font-medium text-muted-foreground">
                  {' '} / {metric.max < 0 ? 'Ilimitado' : metric.max}
                </span>
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-dashed border-border/60 bg-card p-6">
        <h2 className="text-xl font-bold text-foreground">Historial de facturación</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Próximamente: historial de pagos a GymKey, facturas y comprobantes.
        </p>
      </section>
    </div>
  );
}
