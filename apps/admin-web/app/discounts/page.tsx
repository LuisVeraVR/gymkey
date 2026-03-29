'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { useAlert } from '@/components/ui/CustomAlert';
import { Skeleton } from '@/components/ui/Skeleton';
import { useSettings } from '@/context/settings-context';
import { formatMoney } from '@/lib/format-money';

type DiscountRow = {
  id: string;
  name: string;
  type: string;
  value: unknown;
  code: string;
  active: boolean;
  plans: { id: string; name?: string }[];
};

const ADMIN_DISCOUNT_ROLES = ['SUPER_ADMIN', 'GYM_ADMIN'] as const;

function isPercentType(t: string) {
  return t === 'Porcentaje' || t === 'PERCENTAGE';
}

export default function DiscountsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { currency, locale } = useSettings();
  const { showAlert } = useAlert();
  const [rows, setRows] = useState<DiscountRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    if (!ADMIN_DISCOUNT_ROLES.includes(user.role as (typeof ADMIN_DISCOUNT_ROLES)[number])) {
      router.replace('/dashboard');
      return;
    }
    (async () => {
      try {
        const { data } = await api.get<DiscountRow[]>('/discounts');
        setRows(data);
      } catch {
        showAlert('error', 'Error al cargar descuentos');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, router, showAlert]);

  if (
    user &&
    !ADMIN_DISCOUNT_ROLES.includes(user.role as (typeof ADMIN_DISCOUNT_ROLES)[number])
  ) {
    return null;
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-fadeIn">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Descuentos</h1>
        <p className="text-muted-foreground mt-1">
          Códigos y reglas del tenant. Para crear o editar también puedes usar Planes →
          Descuentos.
        </p>
      </div>
      <div className="border border-border rounded-xl overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Planes</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No hay descuentos. Créalos desde Planes → Descuentos.
                </td>
              </tr>
            ) : (
              rows.map((d) => (
                <tr key={d.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono">{d.code}</td>
                  <td className="px-4 py-3">{d.name}</td>
                  <td className="px-4 py-3">
                    {d.type === 'PERCENTAGE'
                      ? 'Porcentaje'
                      : d.type === 'FIXED'
                        ? 'Monto fijo'
                        : d.type}
                  </td>
                  <td className="px-4 py-3">
                    {isPercentType(d.type)
                      ? `${String(d.value)}%`
                      : formatMoney(String(d.value), currency, locale)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {d.plans?.length ? `${d.plans.length} plan(es)` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        d.active
                          ? 'text-success text-xs font-medium'
                          : 'text-muted-foreground text-xs'
                      }
                    >
                      {d.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
