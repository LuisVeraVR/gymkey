'use client';

import { useAuth } from '@/context/auth-context';
import { useState } from 'react';

export default function Topbar() {
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  const getRoleBadge = (role: string) => {
    const roles: Record<string, { label: string; className: string }> = {
      SUPER_ADMIN: { label: 'Super Admin', className: 'bg-primary/10 text-primary' },
      GYM_ADMIN: { label: 'Admin', className: 'bg-info/10 text-info' },
      STAFF: { label: 'Staff', className: 'bg-warning/10 text-warning' },
      COACH: { label: 'Coach', className: 'bg-chart-5/10 text-chart-5' },
    };
    return roles[role] || { label: role, className: 'bg-muted text-muted-foreground' };
  };

  const badge = getRoleBadge(user?.role || '');

  return (
    <header className="h-16 flex items-center justify-between px-8 sticky top-0 z-40 bg-transparent">
      <div className="flex items-center gap-3">
        {/* Breadcrumb or Page Title could go here */}
      </div>

      <div className="flex items-center gap-4 bg-card/50 backdrop-blur-xl p-1.5 pr-2 rounded-full border border-border/40 shadow-sm">
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${badge.className}`}>
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
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Configuracion
                  </button>
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Cerrar Sesion
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
