'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { useAlert } from '@/components/ui/CustomAlert';
import { Skeleton } from '@/components/ui/Skeleton';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  accessesToday: number;
  expiredMemberships: number;
  monthlyRevenue: number;
  recentAccess: Array<{
    id: string;
    userName: string;
    time: string;
    status: 'granted' | 'denied';
  }>;
}

type AccessByDay = {
  date: string;
  granted: number;
  denied: number;
};

type HeatmapCell = {
  dow: number;
  hour: number;
  count: number;
  intensity: number;
};

type HeatmapResponse = {
  maxCount: number;
  cells: HeatmapCell[];
};

type RetentionRow = {
  month: string;
  totalStart: number;
  retained: number;
  rate: number;
  churn: number;
};

function StatCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 hover:border-border-hover transition-colors">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
          {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="w-10 h-10 rounded-lg" />
      </div>
    </div>
  );
}

function ActivityItem({
  name,
  time,
  status,
}: {
  name: string;
  time: string;
  status: 'granted' | 'denied';
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div
        className={`w-1.5 h-1.5 rounded-full ${status === 'granted' ? 'bg-success' : 'bg-destructive'}`}
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{name}</p>
        <p className="text-[10px] text-muted-foreground">{time}</p>
      </div>
      <span
        className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
          status === 'granted'
            ? 'bg-success/10 text-success'
            : 'bg-destructive/10 text-destructive'
        }`}
      >
        {status === 'granted' ? 'Acceso' : 'Denegado'}
      </span>
    </div>
  );
}

const DOW_LABELS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

const HEAT_COLORS = [
  'bg-muted/60',
  'bg-primary/20',
  'bg-primary/35',
  'bg-primary/50',
  'bg-primary/70',
  'bg-primary',
];

function heatClass(intensity: number) {
  if (intensity <= 0) return HEAT_COLORS[0];
  if (intensity <= 0.2) return HEAT_COLORS[1];
  if (intensity <= 0.4) return HEAT_COLORS[2];
  if (intensity <= 0.6) return HEAT_COLORS[3];
  if (intensity <= 0.8) return HEAT_COLORS[4];
  return HEAT_COLORS[5];
}

function formatRelativeTime(iso: string) {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) return 'Ahora';
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return 'Hace un momento';
  const min = Math.floor(sec / 60);
  if (min < 60) return `Hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Hace ${h} h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `Hace ${days} d`;
  return d.toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' });
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [accessByDay, setAccessByDay] = useState<AccessByDay[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapResponse>({ maxCount: 0, cells: [] });
  const [retention, setRetention] = useState<RetentionRow[]>([]);
  const [chartDays, setChartDays] = useState(7);
  const [heatMonths, setHeatMonths] = useState(3);
  const [retentionMonths, setRetentionMonths] = useState(6);
  const [loading, setLoading] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [reportType, setReportType] = useState<'payments' | 'checkins' | 'members'>('payments');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { showAlert } = useAlert();

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [statsRes, chartRes, heatmapRes, retentionRes] = await Promise.all([
          api.get<DashboardStats>('/dashboard/stats'),
          api.get<AccessByDay[]>(`/dashboard/access-by-day?days=${chartDays}`),
          api.get<HeatmapResponse>(`/dashboard/occupancy-heatmap?months=${heatMonths}`),
          api.get<RetentionRow[]>(`/dashboard/retention?months=${retentionMonths}`),
        ]);
        setStats({
          ...statsRes.data,
          recentAccess: statsRes.data.recentAccess.map((a) => ({
            ...a,
            time: formatRelativeTime(a.time),
          })),
        });
        setAccessByDay(chartRes.data);
        setHeatmap(heatmapRes.data);
        setRetention(retentionRes.data);
      } catch {
        showAlert('error', 'Error al cargar métricas del dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [showAlert, chartDays, heatMonths, retentionMonths]);

  const retentionAvg = useMemo(() => {
    if (!retention.length) return 0;
    return retention.reduce((acc, r) => acc + r.rate, 0) / retention.length;
  }, [retention]);

  const retentionColor =
    retentionAvg >= 75 ? 'text-success' : retentionAvg >= 55 ? 'text-warning' : 'text-destructive';

  const byDowHour = useMemo(() => {
    const map = new Map<string, HeatmapCell>();
    for (const c of heatmap.cells) map.set(`${c.dow}-${c.hour}`, c);
    return map;
  }, [heatmap.cells]);

  const downloadReport = () => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const query = params.toString();
    const suffix = query ? `?${query}` : '';
    window.open(`${api.defaults.baseURL}/reports/${reportType}${suffix}`, '_blank');
    setExportOpen(false);
  };

  const points = retention
    .map((r, idx) => {
      const width = 100;
      const height = 36;
      const x = retention.length > 1 ? (idx / (retention.length - 1)) * width : 0;
      const y = height - (Math.max(0, Math.min(100, r.rate)) / 100) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Vista general de tu gimnasio</p>
        </div>
        <button
          onClick={() => setExportOpen(true)}
          className="h-8 px-4 bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-medium rounded-md transition-colors"
        >
          Exportar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <StatCard
              title="Usuarios Activos"
              value={stats?.activeUsers || 0}
              subtitle={`${stats?.totalUsers || 0} usuarios totales`}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M15 19.13a9.3 9.3 0 002.63.37 9.34 9.34 0 004.12-.95 4.13 4.13 0 00-7.53-2.5M15 19.13v.1A12.3 12.3 0 018.62 21c-2.33 0-4.51-.64-6.37-1.77v-.1a6.38 6.38 0 0111.96-3.07M12 6.38a3.38 3.38 0 11-6.75 0 3.38 3.38 0 016.75 0zm8.25 2.25a2.63 2.63 0 11-5.25 0 2.63 2.63 0 015.25 0z" />
                </svg>
              }
            />
            <StatCard
              title="Accesos Hoy"
              value={stats?.accessesToday || 0}
              subtitle="Checkins permitidos"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.03 5.91c-.56-.1-1.16.03-1.56.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.82c0-.6.24-1.17.66-1.59l6.5-6.5c.4-.4.52-1 .43-1.56A6 6 0 1121.75 8.25z" />
                </svg>
              }
            />
            <StatCard
              title="Membresías Vencidas"
              value={stats?.expiredMemberships || 0}
              subtitle="Requieren atención"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 9v3.75m0 3.75h.01M3.32 17.13l7.34-12.7a1.5 1.5 0 012.6 0l7.34 12.7A1.5 1.5 0 0119.3 19.5H4.7a1.5 1.5 0 01-1.38-2.37z" />
                </svg>
              }
            />
            <StatCard
              title="Ingresos del Mes"
              value={`$${(stats?.monthlyRevenue || 0).toLocaleString()}`}
              subtitle="Pagos completados"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 6v12m-3-2.82l.88.66a3.75 3.75 0 004.24 0c1.17-.88 1.17-2.3 0-3.18A3.76 3.76 0 0012 12a3.76 3.76 0 00-2.12-.66c-1.17-.88-1.17-2.3 0-3.18a3.75 3.75 0 014.24 0l.41.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatCard
              title="Retención Mensual"
              value={`${retentionAvg.toFixed(1)}%`}
              subtitle="Promedio reciente"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M3 3v18h18M7 14l4-4 3 3 5-6" />
                </svg>
              }
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Accesos por día</h3>
              <p className="text-sm text-muted-foreground">Últimos {chartDays} días</p>
            </div>
            <div className="flex items-center gap-2">
              {[7, 30, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setChartDays(d)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                    chartDays === d
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {d}D
                </button>
              ))}
            </div>
          </div>

          <div className="h-64 flex items-end justify-between gap-3 pt-4">
            {accessByDay.length === 0 && !loading ? (
              <p className="text-sm text-muted-foreground m-auto">Sin datos de checkins aún</p>
            ) : (
              accessByDay.map((entry) => {
                const maxVal = Math.max(...accessByDay.map((e) => e.granted + e.denied), 1);
                const total = entry.granted + entry.denied;
                const pct = (total / maxVal) * 100;
                const grantedPct = total > 0 ? (entry.granted / total) * 100 : 0;
                const dayLabel = new Date(entry.date + 'T12:00:00').toLocaleDateString('es', {
                  weekday: 'short',
                  day: 'numeric',
                });
                return (
                  <div key={entry.date} className="flex-1 flex flex-col items-center gap-2 group relative">
                    <div
                      className="w-full rounded-t relative overflow-hidden flex flex-col justify-end"
                      style={{ height: `${Math.max(pct, 4)}%` }}
                    >
                      <div className="bg-primary/80" style={{ height: `${grantedPct}%` }} />
                      <div className="bg-destructive/80" style={{ height: `${100 - grantedPct}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground leading-tight text-center">
                      {dayLabel}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Actividad reciente</h3>
          </div>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-8 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {stats?.recentAccess.map((access) => (
                <ActivityItem
                  key={access.id}
                  name={access.userName}
                  time={access.time}
                  status={access.status}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Mapa de Calor de Ocupación</h3>
              <p className="text-sm text-muted-foreground">6:00 - 21:00, últimos {heatMonths} meses</p>
            </div>
            <div className="flex gap-2">
              {[1, 3, 6].map((m) => (
                <button
                  key={m}
                  onClick={() => setHeatMonths(m)}
                  className={`px-2 py-1 text-xs rounded ${
                    heatMonths === m ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-auto">
            <div className="grid grid-cols-[52px_repeat(16,minmax(28px,1fr))] gap-1 text-[10px] min-w-[620px]">
              <div />
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={`h-${i}`} className="text-center text-muted-foreground">
                  {i + 6}
                </div>
              ))}
              {Array.from({ length: 7 }).map((_, dow) => (
                <div key={`row-${dow}`} className="contents">
                  <div key={`label-${dow}`} className="text-muted-foreground py-1">
                    {DOW_LABELS[dow]}
                  </div>
                  {Array.from({ length: 16 }).map((__, i) => {
                    const hour = i + 6;
                    const cell = byDowHour.get(`${dow}-${hour}`);
                    const count = cell?.count || 0;
                    const intensity = cell?.intensity || 0;
                    return (
                      <div
                        key={`${dow}-${hour}`}
                        title={`${DOW_LABELS[dow]} ${hour}:00 · ${count} accesos`}
                        className={`h-6 rounded ${heatClass(intensity)} border border-border/40`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Retención mensual</h3>
              <p className="text-sm text-muted-foreground">Últimos {retentionMonths} meses</p>
            </div>
            <div className="flex gap-2">
              {[3, 6, 12].map((m) => (
                <button
                  key={m}
                  onClick={() => setRetentionMonths(m)}
                  className={`px-2 py-1 text-xs rounded ${
                    retentionMonths === m ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-end justify-between mb-4">
            <p className={`text-3xl font-bold ${retentionColor}`}>{retentionAvg.toFixed(1)}%</p>
            <p className="text-sm text-muted-foreground">Promedio de retención</p>
          </div>

          <div className="w-full h-20 bg-muted/20 rounded p-2 mb-4">
            <svg viewBox="0 0 100 36" className="w-full h-full">
              <polyline
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="text-primary"
                points={points}
              />
            </svg>
          </div>

          <div className="space-y-2 text-sm">
            {retention.map((r) => (
              <div key={r.month} className="flex items-center justify-between">
                <span className="text-muted-foreground">{r.month}</span>
                <span className="text-foreground font-medium">{r.rate.toFixed(1)}% · churn {r.churn.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {exportOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-xl p-5">
            <h3 className="text-base font-semibold text-foreground mb-4">Exportar reporte CSV</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Tipo</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as 'payments' | 'checkins' | 'members')}
                  className="w-full h-9 px-3 text-sm bg-card border border-border rounded-md"
                >
                  <option value="payments">Pagos</option>
                  <option value="checkins">Checkins</option>
                  <option value="members">Miembros</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Desde</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full h-9 px-3 text-sm bg-card border border-border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Hasta</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full h-9 px-3 text-sm bg-card border border-border rounded-md"
                  />
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setExportOpen(false)}
                className="h-8 px-3 text-xs rounded-md border border-border"
              >
                Cancelar
              </button>
              <button
                onClick={downloadReport}
                className="h-8 px-3 text-xs rounded-md bg-primary text-primary-foreground"
              >
                Descargar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
