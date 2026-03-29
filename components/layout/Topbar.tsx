'use client';

import { useAuth } from '@/context/auth-context';
import { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';
import { Moon, Sun, Globe, LogOut, Settings, Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Mock notifications type
interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'info' | 'success' | 'warning';
  read: boolean;
}

export default function Topbar() {
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const notificationRef = useRef<HTMLDivElement>(null);

  // Prevent hydration mismatch
  useEffect(() => {
    const id = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const getRoleBadge = (role: string) => {
    const roles: Record<string, { label: string; className: string }> = {
      SUPER_ADMIN: { label: t('users.admin'), className: 'bg-primary/10 text-primary' },
      GYM_ADMIN: { label: t('users.admin'), className: 'bg-info/10 text-info' },
      STAFF: { label: 'Staff', className: 'bg-warning/10 text-warning' },
      COACH: { label: t('users.coach'), className: 'bg-chart-5/10 text-chart-5' },
    };
    return roles[role] || { label: role, className: 'bg-muted text-muted-foreground' };
  };

  const badge = getRoleBadge(user?.role || '');

  const toggleLanguage = () => {
    const newLang = i18n.language === 'es' ? 'en' : 'es';
    i18n.changeLanguage(newLang);
  };

  if (!mounted) {
    return (
      <header className="h-16 flex items-center justify-between px-8 sticky top-0 z-40 bg-transparent" />
    );
  }

  return (
    <header className="h-16 flex items-center justify-between px-8 sticky top-0 z-40 bg-transparent">
      <div className="flex items-center gap-3">
        {/* Breadcrumb or Page Title could go here */}
      </div>

      <div className="flex items-center gap-4 bg-card/50 backdrop-blur-xl p-1.5 pr-2 rounded-full border border-border/40 shadow-sm">
        
        {/* Language Toggle */}
        <button
          onClick={toggleLanguage}
          className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title={t('settings.language')}
        >
          <div className="flex items-center gap-1">
            <Globe className="w-4 h-4" />
            <span className="text-xs font-medium uppercase">{i18n.language}</span>
          </div>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title={theme === 'dark' ? t('settings.lightMode') : t('settings.darkMode')}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>

        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors relative"
            title="Notificaciones"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-card animate-pulse" />
            )}
          </button>

          {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 bg-card/90 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl z-50 animate-fadeIn overflow-hidden">
                <div className="p-4 border-b border-border/50 flex items-center justify-between bg-muted/30">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-foreground">Notificaciones</h3>
                      <span className="text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        Demo
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {notifications.length === 0
                        ? 'Sin conexión en vivo al backend de notificaciones'
                        : `${unreadCount} sin leer`}
                    </p>
                  </div>
                  {unreadCount > 0 && (
                    <button 
                      onClick={markAllAsRead}
                      className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                    >
                      Marcar todas leídas
                    </button>
                  )}
                </div>
                
                <div className="max-h-[320px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Bell className="w-8 h-8 mx-auto mb-3 opacity-20" />
                      <p className="text-xs leading-relaxed max-w-[240px] mx-auto">
                        Las notificaciones en tiempo real se integrarán con el gateway de
                        notificaciones de la API. Por ahora esta lista está vacía.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/30">
                      {notifications.map((notification) => (
                        <div 
                          key={notification.id}
                          className={`p-4 hover:bg-muted/50 transition-colors cursor-pointer ${!notification.read ? 'bg-primary/5' : ''}`}
                          onClick={() => markAsRead(notification.id)}
                        >
                          <div className="flex gap-3">
                            <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                              notification.type === 'success' ? 'bg-green-500' :
                              notification.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                            }`} />
                            <div className="flex-1 space-y-1">
                              <p className={`text-sm ${!notification.read ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'}`}>
                                {notification.title}
                              </p>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {notification.message}
                              </p>
                              <p className="text-[10px] text-muted-foreground/60 pt-1">
                                {notification.time}
                              </p>
                            </div>
                            {!notification.read && (
                              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="p-2 border-t border-border/50 bg-muted/30">
                  <button className="w-full py-1.5 text-xs text-center text-muted-foreground hover:text-primary transition-colors">
                    Ver todas las notificaciones
                  </button>
                </div>
              </div>
          )}
        </div>

        <div className="w-px h-4 bg-border/50 mx-1" />

        <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 min-w-[120px] text-center ${badge.className}`}>
          {badge.label}
        </span>

        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-3 rounded-full hover:bg-muted/50 transition-colors pr-1"
          >
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-xs shadow-md shadow-primary/20">
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </div>
          </button>

          {showDropdown && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowDropdown(false)} 
              />
              <div className="absolute right-0 mt-3 w-56 bg-card/90 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl z-50 animate-fadeIn overflow-hidden">
                <div className="p-4 border-b border-border/50 bg-muted/30">
                  <p className="text-sm font-semibold text-foreground">{user?.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
                </div>
                <div className="p-1.5">
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      router.push('/settings');
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    {t('common.settings')}
                  </button>
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    {t('common.logout')}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
