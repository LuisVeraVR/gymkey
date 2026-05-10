'use client';

import { useAuth } from "@/context/auth-context";
import { usePlatform } from "@/context/platform-context";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { LoadingScreen } from "@/components/ui/LoadingScreen";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { subscription, isDemo, isTrialing, isExpired, isBillingBlocked, daysLeftInTrial, canAccessRoute } = usePlatform();
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  if (loading) return <LoadingScreen />;
  
  const publicRoutes = ['/login', '/forgot-password'];
  const isPublicRoute = publicRoutes.includes(pathname) || pathname.startsWith('/gym/');

  if (!user || isPublicRoute) {
    return <>{children}</>;
  }

  const routeAllowed = canAccessRoute(pathname);
  const showBillingBlock = !routeAllowed && pathname !== '/billing';

  let banner: React.ReactNode = null;
  if (isDemo) {
    banner = (
      <div className="mb-4 rounded-2xl border border-border/60 bg-muted/60 px-5 py-3 text-sm text-foreground">
        Estás en modo Demo. Los datos son de ejemplo. Ve a <strong>Facturación</strong> para iniciar tu prueba gratuita de 15 días.
      </div>
    );
  } else if (isTrialing) {
    const urgent = (daysLeftInTrial ?? 99) <= 3;
    banner = (
      <div className={`mb-4 rounded-2xl px-5 py-3 text-sm text-white ${urgent ? 'bg-amber-500' : 'bg-gradient-to-r from-primary to-sky-500'}`}>
        Prueba gratuita activa. Te quedan <strong>{daysLeftInTrial ?? 0} días</strong>. Ve a <strong>Facturación</strong> para elegir tu plan.
      </div>
    );
  } else if (isExpired || isBillingBlocked) {
    banner = (
      <div className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/10 px-5 py-3 text-sm text-destructive">
        Tu suscripción de GymKey no está activa. Solo algunas áreas permanecen disponibles hasta que actives un plan desde <strong>Facturación</strong>.
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar 
        isCollapsed={isSidebarCollapsed} 
        toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
      />
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        <Topbar />
        <main className="flex-1 overflow-auto p-8">
          {banner}
          {showBillingBlock ? (
            <div className="mx-auto mt-10 max-w-2xl rounded-3xl border border-border/60 bg-card p-10 text-center shadow-sm">
              <h1 className="text-2xl font-bold text-foreground">Función no disponible en tu plan actual</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Esta sección está bloqueada por el plan o por el estado de la suscripción del gimnasio.
                Revisa Facturación para actualizar el plan y continuar.
              </p>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}