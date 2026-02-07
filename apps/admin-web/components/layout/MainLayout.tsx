'use client';

import { useAuth } from "@/context/auth-context";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { LoadingScreen } from "@/components/ui/LoadingScreen";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  if (loading) return <LoadingScreen />;
  
  const publicRoutes = ['/login', '/forgot-password'];
  const isPublicRoute = publicRoutes.includes(pathname);

  if (!user || isPublicRoute) {
    return <>{children}</>;
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
          {children}
        </main>
      </div>
    </div>
  );
}