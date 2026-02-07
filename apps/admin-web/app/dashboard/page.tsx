'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAlert } from '@/components/ui/CustomAlert';
import { motion } from 'framer-motion';
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

function StatCard({ 
  title, 
  value, 
  change, 
  changeType = 'neutral',
  icon 
}: { 
  title: string; 
  value: string | number; 
  change?: string;
  changeType?: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 hover:border-border-hover transition-colors">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
          {change && (
            <div className={`flex items-center gap-1 text-xs ${
              changeType === 'up' ? 'text-success' : 
              changeType === 'down' ? 'text-destructive' : 
              'text-muted-foreground'
            }`}>
              {changeType === 'up' && (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
                </svg>
              )}
              {changeType === 'down' && (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-9.2 9.2M7 7v10h10" />
                </svg>
              )}
              <span>{change}</span>
            </div>
          )}
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
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="w-10 h-10 rounded-lg" />
      </div>
    </div>
  );
}

function ActivityItem({ 
  name, 
  time, 
  status 
}: { 
  name: string; 
  time: string; 
  status: 'granted' | 'denied';
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className={`w-1.5 h-1.5 rounded-full ${status === 'granted' ? 'bg-success' : 'bg-destructive'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{name}</p>
        <p className="text-[10px] text-muted-foreground">{time}</p>
      </div>
      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
        status === 'granted' 
          ? 'bg-success/10 text-success' 
          : 'bg-destructive/10 text-destructive'
      }`}>
        {status === 'granted' ? 'Acceso' : 'Denegado'}
      </span>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { showAlert } = useAlert();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Simulated data - replace with actual API call
        // const { data } = await api.get('/dashboard/stats');
        await new Promise(resolve => setTimeout(resolve, 800));
        setStats({
          totalUsers: 248,
          activeUsers: 186,
          accessesToday: 47,
          expiredMemberships: 12,
          monthlyRevenue: 15420,
          recentAccess: [
            { id: '1', userName: 'Carlos Rodriguez', time: 'Hace 2 min', status: 'granted' },
            { id: '2', userName: 'Maria Garcia', time: 'Hace 5 min', status: 'granted' },
            { id: '3', userName: 'Juan Martinez', time: 'Hace 8 min', status: 'denied' },
            { id: '4', userName: 'Ana Lopez', time: 'Hace 12 min', status: 'granted' },
            { id: '5', userName: 'Pedro Sanchez', time: 'Hace 15 min', status: 'granted' },
          ]
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
        showAlert('error', 'Error al cargar estadísticas');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Vista general de tu gimnasio</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="h-8 px-4 bg-secondary hover:bg-secondary-hover text-secondary-foreground text-sm font-medium rounded-md transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filtros
          </button>
          <button className="h-8 px-4 bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-medium rounded-md transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Exportar
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          <>
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
              change="+12% vs mes anterior"
              changeType="up"
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              }
            />
            <StatCard
              title="Accesos Hoy"
              value={stats?.accessesToday || 0}
              change="+5 en la ultima hora"
              changeType="up"
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                </svg>
              }
            />
            <StatCard
              title="Membresias Vencidas"
              value={stats?.expiredMemberships || 0}
              change="Requieren atencion"
              changeType="down"
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              }
            />
            <StatCard
              title="Ingresos del Mes"
              value={`$${(stats?.monthlyRevenue || 0).toLocaleString()}`}
              change="+8% vs mes anterior"
              changeType="up"
              icon={
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
          </>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Placeholder */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Accesos por Dia</h3>
              <p className="text-sm text-muted-foreground">Ultimos 7 dias</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary rounded-md">7D</button>
              <button className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground rounded-md">30D</button>
              <button className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground rounded-md">90D</button>
            </div>
          </div>
          
          {/* Simple Bar Chart */}
          <div className="h-64 flex items-end justify-between gap-4 pt-4">
            {['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].map((day, i) => {
              const heights = [65, 80, 45, 90, 70, 95, 55];
              return (
                <div key={day} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-muted rounded-t relative overflow-hidden" style={{ height: `${heights[i]}%` }}>
                    <div 
                      className="absolute inset-0 bg-primary/80 hover:bg-primary transition-colors cursor-pointer"
                      style={{ height: '100%' }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Actividad Reciente</h3>
            <button className="text-xs text-primary hover:text-primary-hover transition-colors">Ver todo</button>
          </div>
          
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-3">
                  <div className="w-2 h-2 rounded-full bg-muted animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
                  </div>
                </div>
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

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors cursor-pointer group">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
            </svg>
          </div>
          <h4 className="font-semibold text-foreground mb-1">Nuevo Usuario</h4>
          <p className="text-sm text-muted-foreground">Registra un nuevo miembro del gimnasio</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors cursor-pointer group">
          <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center text-info mb-4 group-hover:bg-info group-hover:text-info-foreground transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
            </svg>
          </div>
          <h4 className="font-semibold text-foreground mb-1">Validar QR</h4>
          <p className="text-sm text-muted-foreground">Accede al control de acceso rapido</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors cursor-pointer group">
          <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center text-warning mb-4 group-hover:bg-warning group-hover:text-warning-foreground transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <h4 className="font-semibold text-foreground mb-1">Generar Reporte</h4>
          <p className="text-sm text-muted-foreground">Crea reportes de actividad y pagos</p>
        </div>
      </div>
    </div>
  );
}
