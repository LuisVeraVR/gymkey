'use client';

import { useEffect, useState, useMemo } from 'react';
import api from '@/lib/api';
import { useAlert } from '@/components/ui/CustomAlert';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { Skeleton } from '@/components/ui/Skeleton';

type ActionVisual = { icon: React.ReactNode; label: string; color: string };

interface AuditEvent {
  id: string;
  action: string;
  actor: {
    name: string;
    email: string;
    role: string;
  };
  target?: {
    type: string;
    name: string;
    id: string;
  };
  details?: string;
  timestamp: string;
  date: string;
  rawTimestamp: string;
}

const docIcon = (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const actionVisuals: Record<string, ActionVisual> = {
  user_created: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
      </svg>
    ),
    label: 'Usuario creado',
    color: 'bg-success/10 text-success',
  },
  user_updated: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    ),
    label: 'Usuario actualizado',
    color: 'bg-info/10 text-info',
  },
  user_deleted: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    ),
    label: 'Usuario eliminado',
    color: 'bg-destructive/10 text-destructive',
  },
  access_granted: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    label: 'Acceso permitido',
    color: 'bg-success/10 text-success',
  },
  access_denied: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    ),
    label: 'Acceso denegado',
    color: 'bg-destructive/10 text-destructive',
  },
  payment_received: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    label: 'Pago recibido',
    color: 'bg-success/10 text-success',
  },
  subscription_created: {
    icon: docIcon,
    label: 'Membresía creada',
    color: 'bg-primary/10 text-primary',
  },
  subscription_expired: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
    ),
    label: 'Membresía vencida',
    color: 'bg-warning/10 text-warning',
  },
  settings_changed: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    label: 'Config. modificada',
    color: 'bg-muted text-muted-foreground',
  },
  login: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
      </svg>
    ),
    label: 'Inicio de sesión',
    color: 'bg-info/10 text-info',
  },
  logout: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
    ),
    label: 'Cierre de sesión',
    color: 'bg-muted text-muted-foreground',
  },
  plan_created: {
    icon: docIcon,
    label: 'Plan creado',
    color: 'bg-primary/10 text-primary',
  },
  plan_updated: {
    icon: docIcon,
    label: 'Plan actualizado',
    color: 'bg-info/10 text-info',
  },
  plan_deleted: {
    icon: docIcon,
    label: 'Plan eliminado',
    color: 'bg-destructive/10 text-destructive',
  },
  discount_created: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" />
      </svg>
    ),
    label: 'Descuento creado',
    color: 'bg-primary/10 text-primary',
  },
  discount_updated: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" />
      </svg>
    ),
    label: 'Descuento actualizado',
    color: 'bg-info/10 text-info',
  },
  discount_deleted: {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" />
      </svg>
    ),
    label: 'Descuento eliminado',
    color: 'bg-destructive/10 text-destructive',
  },
};

function getActionVisual(action: string): ActionVisual {
  const known = actionVisuals[action];
  if (known) return known;
  const human = action.replace(/_/g, ' ');
  return {
    icon: docIcon,
    label: human.charAt(0).toUpperCase() + human.slice(1),
    color: 'bg-muted text-muted-foreground',
  };
}

function calendarDayLabel(d: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const y = new Date(d);
  y.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - y.getTime()) / 86400000);
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  return d.toLocaleDateString('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

type ApiAuditRow = {
  id: string;
  action: string;
  details: unknown;
  timestamp: string;
  user: { id: string; name: string | null; email: string; role: string } | null;
};

function mapApiToEvents(rows: ApiAuditRow[]): AuditEvent[] {
  return rows.map((row) => {
    const ts = new Date(row.timestamp);
    const detailsObj = row.details as { summary?: string } | null;
    const summary = detailsObj && typeof detailsObj.summary === 'string' ? detailsObj.summary : undefined;

    return {
      id: row.id,
      action: row.action,
      actor: {
        name: row.user?.name?.trim() || row.user?.email || 'Sistema',
        email: row.user?.email || '—',
        role: row.user?.role || 'SYSTEM',
      },
      details: summary,
      timestamp: ts.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
      date: calendarDayLabel(ts),
      rawTimestamp: row.timestamp,
    };
  });
}

function AuditEventCard({ event }: { event: AuditEvent }) {
  const config = getActionVisual(event.action);

  return (
    <div className="flex gap-3 p-3 hover:bg-muted/20 transition-colors rounded-lg group">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${config.color}`}>
        {config.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-foreground">
              {config.label}
              {event.target && (
                <span className="text-muted-foreground font-normal">
                  {' - '}
                  {event.target.name}
                </span>
              )}
            </p>
            {event.details && (
              <p className="text-xs text-muted-foreground mt-0.5">{event.details}</p>
            )}
            <p className="text-[10px] text-muted-foreground mt-1">
              Por <span className="font-medium text-foreground">{event.actor.name}</span>
              {event.actor.role !== 'SYSTEM' && (
                <span className="text-muted-foreground"> ({event.actor.email})</span>
              )}
            </p>
          </div>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">{event.timestamp}</span>
        </div>
      </div>
    </div>
  );
}

type FilterType = 'all' | 'users' | 'access' | 'payments' | 'system';

const SYSTEM_ACTIONS = [
  'settings_changed',
  'login',
  'logout',
  'plan_created',
  'plan_updated',
  'plan_deleted',
  'discount_created',
  'discount_updated',
  'discount_deleted',
];

export default function AuditPage() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { showAlert } = useAlert();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get<ApiAuditRow[]>('/audit-logs?limit=300');
        if (!cancelled) setEvents(mapApiToEvents(data));
      } catch {
        if (!cancelled) {
          showAlert('error', 'No se pudo cargar el registro de auditoría');
          setEvents([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showAlert]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesSearch =
        searchQuery === '' ||
        event.actor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.actor.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (event.details?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        event.action.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter =
        filter === 'all' ||
        (filter === 'users' &&
          ['user_created', 'user_updated', 'user_deleted'].includes(event.action)) ||
        (filter === 'access' && ['access_granted', 'access_denied'].includes(event.action)) ||
        (filter === 'payments' &&
          ['payment_received', 'subscription_created', 'subscription_expired'].includes(event.action)) ||
        (filter === 'system' && SYSTEM_ACTIONS.includes(event.action));

      return matchesSearch && matchesFilter;
    });
  }, [events, filter, searchQuery]);

  const groupedEvents = useMemo(() => {
    return filteredEvents.reduce(
      (acc, event) => {
        if (!acc[event.date]) acc[event.date] = [];
        acc[event.date].push(event);
        return acc;
      },
      {} as Record<string, AuditEvent[]>,
    );
  }, [filteredEvents]);

  const stats = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    let today = 0;
    let accessGranted = 0;
    let accessDenied = 0;
    for (const e of events) {
      const t = new Date(e.rawTimestamp);
      if (t >= start) today += 1;
      if (e.action === 'access_granted') accessGranted += 1;
      if (e.action === 'access_denied') accessDenied += 1;
    }
    return {
      total: events.length,
      today,
      accessGranted,
      accessDenied,
    };
  }, [events]);

  if (loading) {
    return (
      <div className="space-y-6 animate-fadeIn p-1">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        Registro persistido en base de datos. Se añaden entradas al guardar configuración, planes y
        descuentos; con el tiempo se pueden enlazar más acciones (accesos, pagos, usuarios).
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Auditoría</h1>
          <p className="text-muted-foreground mt-1">Historial de actividades del tenant</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar en el log..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-10 pr-4 bg-card border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>

        <div className="w-full sm:w-[200px]">
          <CustomSelect
            value={filter}
            onChange={(val) => setFilter(val as FilterType)}
            options={[
              { value: 'all', label: 'Todo' },
              { value: 'users', label: 'Usuarios' },
              { value: 'access', label: 'Accesos' },
              { value: 'payments', label: 'Pagos' },
              { value: 'system', label: 'Sistema y catálogo' },
            ]}
            placeholder="Filtrar por tipo"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Eventos hoy', value: String(stats.today), color: 'text-foreground' },
          { label: 'Accesos permitidos (total)', value: String(stats.accessGranted), color: 'text-success' },
          { label: 'Accesos denegados (total)', value: String(stats.accessDenied), color: 'text-destructive' },
          { label: 'Total en historial', value: String(stats.total), color: 'text-primary' },
        ].map((stat) => (
          <div key={stat.label} className="bg-card border border-border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {Object.keys(groupedEvents).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Sin eventos</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              {events.length === 0
                ? 'Aún no hay registros. Al guardar configuración o modificar planes/descuentos aparecerán aquí.'
                : 'No hay resultados con los filtros seleccionados.'}
            </p>
          </div>
        ) : (
          Object.entries(groupedEvents).map(([date, group]) => (
            <div key={date}>
              <div className="px-4 py-3 bg-muted/30 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground capitalize">{date}</h3>
              </div>
              <div className="divide-y divide-border">
                {group.map((event) => (
                  <AuditEventCard key={event.id} event={event} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
