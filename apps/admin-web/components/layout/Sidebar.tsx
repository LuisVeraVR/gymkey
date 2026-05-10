'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { useSocket } from '@/context/socket-context';
import { usePlatform } from '@/context/platform-context';
import api from '@/lib/api';

type MenuItem = {
  name: string;
  href: string;
  icon: ReactNode;
  roles?: string[];
  feature?: 'discounts' | 'classBookings';
  billingOnly?: boolean;
};

type MenuGroup = {
  title?: string;
  items: MenuItem[];
};

const menuGroups: MenuGroup[] = [
  {
    title: 'Principal',
    items: [
      { 
        name: 'Dashboard', 
        href: '/dashboard', 
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
          </svg>
        )
      },
    ]
  },
  {
    title: 'Gestión',
    items: [
      { 
        name: 'Usuarios', 
        href: '/users', 
        roles: ['SUPER_ADMIN', 'GYM_ADMIN'],
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
        )
      },
      { 
        name: 'Planes', 
        href: '/plans', 
        roles: ['SUPER_ADMIN', 'GYM_ADMIN'],
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
          </svg>
        )
      },
      { 
        name: 'Descuentos', 
        href: '/discounts', 
        roles: ['SUPER_ADMIN', 'GYM_ADMIN'],
        feature: 'discounts',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185zM9.75 9h.008v.008H9.75V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 4.5h.008v.008h-.008V13.5zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
        )
      },
      { 
        name: 'Accesos', 
        href: '/access', 
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
          </svg>
        )
      },
    ]
  },
  {
    title: 'Operaciones',
    items: [
      { 
        name: 'Pagos', 
        href: '/payments', 
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
          </svg>
        )
      },
      { 
        name: 'Suscripciones', 
        href: '/subscriptions', 
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
        )
      },
      { 
        name: 'Rutinas', 
        href: '/routines', 
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
          </svg>
        )
      },
      { 
        name: 'Clases', 
        href: '/classes', 
        feature: 'classBookings',
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 2.25A.75.75 0 017.5 3v1.5h9V3a.75.75 0 011.5 0v1.5h1.5A2.25 2.25 0 0121.75 6.75v12A2.25 2.25 0 0119.5 21h-15a2.25 2.25 0 01-2.25-2.25v-12A2.25 2.25 0 014.5 4.5H6V3a.75.75 0 01.75-.75zM4.5 9h15" />
          </svg>
        )
      },
    ]
  },
  {
    title: 'Sistema',
    items: [
      { 
        name: 'Auditoria', 
        href: '/audit', 
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      },
      { 
        name: 'Facturación', 
        href: '/billing', 
        roles: ['SUPER_ADMIN', 'GYM_ADMIN'],
        billingOnly: true,
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M3.75 6.75h16.5A1.5 1.5 0 0121.75 8.25v7.5A1.5 1.5 0 0120.25 17.25H3.75a1.5 1.5 0 01-1.5-1.5v-7.5a1.5 1.5 0 011.5-1.5zM6.75 12h3.75" />
          </svg>
        )
      },
      { 
        name: 'Configuracion', 
        href: '/settings', 
        roles: ['SUPER_ADMIN', 'GYM_ADMIN'],
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )
      },
    ]
  }
];

interface SidebarProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

export default function Sidebar({ isCollapsed, toggleSidebar }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { isConnected } = useSocket();
  const { subscription, usage, hasFeature, isBillingBlocked, isTrialing, daysLeftInTrial } = usePlatform();
  const displayName =
    user?.name?.trim() || user?.email?.split('@')[0] || 'Usuario';
  const [accessBadge, setAccessBadge] = useState(0);
  const [auditBadge, setAuditBadge] = useState(0);

  useEffect(() => {
    let mounted = true;
    const loadIndicators = async () => {
      try {
        const { data } = await api.get<{
          accessTodayCount: number;
          recentAuditCount: number;
        }>('/dashboard/sidebar-indicators');
        if (!mounted) return;
        setAccessBadge(data.accessTodayCount || 0);
        setAuditBadge(data.recentAuditCount || 0);
      } catch {
        if (!mounted) return;
        setAccessBadge(0);
        setAuditBadge(0);
      }
    };
    loadIndicators();
    const id = setInterval(loadIndicators, 60000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  return (
    <aside 
      className={`fixed left-0 top-0 h-screen bg-card/50 backdrop-blur-xl border-r border-border/40 flex flex-col z-50 transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Logo & Toggle */}
      <div className={`h-16 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between px-6'}`}>
        {!isCollapsed && (
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform duration-300">
              <svg className="w-5 h-5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight whitespace-nowrap">
              Gym<span className="text-primary">Key</span>
            </span>
          </Link>
        )}
        
        {/* Toggle Button */}
        <button 
          onClick={toggleSidebar}
          className={`p-1.5 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors ${isCollapsed ? 'mx-auto' : ''}`}
        >
          {isCollapsed ? (
             // Logo icon when collapsed
            <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 transition-transform duration-300">
               <svg className="w-5 h-5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
               </svg>
             </div>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 py-4 overflow-y-auto scrollbar-thin scrollbar-thumb-border/50 ${isCollapsed ? 'px-2' : 'px-3'}`}>
        {menuGroups.map((group, groupIndex) => (
          <div key={group.title || groupIndex} className="mb-6 last:mb-0">
            {!isCollapsed && group.title && (
              <p className="px-3 text-xs font-semibold text-muted-foreground/50 uppercase tracking-wider mb-2 animate-fadeIn">
                {group.title}
              </p>
            )}
            
            <div className="space-y-1">
              {group.items.map((item) => {
                if (item.roles && (!user || !item.roles.includes(user.role))) {
                  return null;
                }
                const lockedByFeature = item.feature ? !hasFeature(item.feature) : false;
                const forcedBilling = item.billingOnly || lockedByFeature;
                
                const effectiveHref = forcedBilling && item.href !== '/billing' ? '/billing' : item.href;
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={effectiveHref}
                    title={isCollapsed ? item.name : ''}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 group ${
                      isActive 
                        ? 'bg-primary/10 text-primary' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    } ${isCollapsed ? 'justify-center' : ''}`}
                  >
                    <div className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                      {item.icon}
                    </div>
                    {!isCollapsed && (
                      <>
                        <span className="whitespace-nowrap animate-fadeIn">{item.name}</span>
                        {lockedByFeature && (
                          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-warning/15 text-warning font-semibold">
                            Pro
                          </span>
                        )}
                        {item.href === '/access' && accessBadge > 0 && (
                          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-semibold">
                            {accessBadge}
                          </span>
                        )}
                        {item.href === '/audit' && auditBadge > 0 && (
                          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-warning/15 text-warning font-semibold">
                            {auditBadge}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
            
            {/* Divider between groups when collapsed (optional, but nice) */}
            {isCollapsed && groupIndex < menuGroups.length - 1 && (
              <div className="mx-2 my-2 border-b border-border/40" />
            )}
          </div>
        ))}
      </nav>
      
      <div className={`border-t border-border/40 ${isCollapsed ? 'p-3' : 'p-4'}`}>
        {!isCollapsed && subscription && usage && (
          <div className="mb-4 space-y-2 rounded-2xl border border-border/50 bg-muted/30 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">Plan {subscription.plan}</span>
              {isTrialing ? (
                <span className="text-primary">Trial {daysLeftInTrial ?? 0}d</span>
              ) : isBillingBlocked ? (
                <span className="text-destructive">Bloqueado</span>
              ) : (
                <span className="text-success">Activo</span>
              )}
            </div>
            {([
              ['Miembros', usage.members],
              ['Staff', usage.staff],
              ['Rutinas', usage.routines],
            ] as const).map(([label, metric]) => {
              const percent =
                metric.max > 0 ? Math.min(100, Math.round((metric.current / metric.max) * 100)) : 0;
              return (
                <div key={label}>
                  <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{label}</span>
                    <span>{metric.current} / {metric.max < 0 ? 'Ilimitado' : metric.max}</span>
                  </div>
                  <div className="h-2 rounded-full bg-border/50">
                    <div className={`h-2 rounded-full ${percent >= 100 ? 'bg-destructive' : percent >= 80 ? 'bg-warning' : 'bg-primary'}`} style={{ width: `${metric.max < 0 ? 0 : percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className={`flex items-center ${isCollapsed ? 'justify-center gap-2' : 'justify-between gap-3'}`}>
          {!isCollapsed && (
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email || '-'}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span
                  className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-destructive'}`}
                />
                <span className="text-[10px] text-muted-foreground">
                  {isConnected ? 'Socket conectado' : 'Socket desconectado'}
                </span>
              </div>
            </div>
          )}
          <button
            onClick={() => void logout()}
            title="Cerrar sesión"
            className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m-7.5-3h12m0 0l-3-3m3 3l-3 3" />
            </svg>
          </button>
          {isCollapsed && (
            <span
              title={isConnected ? 'Socket conectado' : 'Socket desconectado'}
              className={`w-2 h-2 rounded-full ${isConnected ? 'bg-success' : 'bg-destructive'}`}
            />
          )}
        </div>
      </div>

    </aside>
  );
}
