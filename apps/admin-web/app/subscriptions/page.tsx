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

type HistoryRow = {
  id: string;
  status: string;
  isCurrent: boolean;
  startDate: string;
  endDate: string;
  plan: { name: string };
};

export default function SubscriptionsPage() {
  const { showAlert } = useAlert();
  const [rows, setRows] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<HistoryRow[] | null>(null);
  const [historyUser, setHistoryUser] = useState<string>('');

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

  const openHistory = async (userId: string, userName: string) => {
    try {
      const { data } = await api.get<HistoryRow[]>(
        `/subscriptions/history?userId=${userId}`,
      );
      setHistory(data);
      setHistoryUser(userName);
    } catch {
      showAlert('error', 'Error al cargar historial');
    }
  };

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
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
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
                  <td className="px-4 py-3">
                    <button
                      onClick={() =>
                        openHistory(s.user.id, s.user.name || s.user.email)
                      }
                      className="text-xs text-primary hover:text-primary-hover transition-colors font-medium"
                    >
                      Ver historial
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {history && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-auto shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">
                Historial — {historyUser}
              </h2>
              <button
                onClick={() => setHistory(null)}
                className="text-muted-foreground hover:text-foreground transition-colors text-xl leading-none"
              >
                &times;
              </button>
            </div>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin historial de suscripciones.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="text-left py-2">Plan</th>
                    <th className="text-left py-2">Estado</th>
                    <th className="text-left py-2">Inicio</th>
                    <th className="text-left py-2">Fin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {history.map((h) => (
                    <tr key={h.id} className={h.isCurrent ? 'bg-primary/5' : ''}>
                      <td className="py-2">{h.plan.name}</td>
                      <td className="py-2">{h.status}</td>
                      <td className="py-2 text-muted-foreground">
                        {new Date(h.startDate).toLocaleDateString('es')}
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {new Date(h.endDate).toLocaleDateString('es')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
