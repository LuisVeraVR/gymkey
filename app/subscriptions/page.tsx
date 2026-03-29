'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAlert } from '@/components/ui/CustomAlert';
import { Skeleton } from '@/components/ui/Skeleton';

type SubscriptionRow = {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  user: { id: string; name: string | null; email: string };
  plan: { id: string; name: string; price: unknown };
};

export default function SubscriptionsPage() {
  const { showAlert } = useAlert();
  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get<SubscriptionRow[]>('/subscriptions/list');
        setRows(data);
      } catch {
        showAlert('error', 'Error al cargar suscripciones');
      } finally {
        setLoading(false);
      }
    })();
  }, [showAlert]);

  if (loading) {
    return (
      <div className="space-y-4 animate-fadeIn">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Suscripciones</h1>
        <p className="text-muted-foreground mt-1">Membresías del gimnasio (tenant actual)</p>
      </div>
      <div className="border border-border rounded-xl overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Miembro</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Inicio</th>
              <th className="px-4 py-3">Fin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No hay suscripciones en este tenant.
                </td>
              </tr>
            ) : (
              rows.map((s) => (
                <tr key={s.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">
                      {s.user.name || s.user.email}
                    </div>
                    <div className="text-xs text-muted-foreground">{s.user.email}</div>
                  </td>
                  <td className="px-4 py-3">{s.plan.name}</td>
                  <td className="px-4 py-3">{s.status}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(s.startDate).toLocaleDateString('es')}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(s.endDate).toLocaleDateString('es')}
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
