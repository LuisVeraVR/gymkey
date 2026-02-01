'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const menuItems = [
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
    { name: 'Control Acceso', href: '/access', icon: '🔑' },
    { name: 'Usuarios', href: '/users', icon: '👥' },
    { name: 'Planes', href: '/plans', icon: '💳' },
    { name: 'Reportes', href: '/reports', icon: '📈' },
  ];

  return (
    <div className="w-64 bg-slate-900 text-white min-h-screen flex flex-col">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-2xl font-bold tracking-tight">GymKey <span className="text-blue-500">Admin</span></h1>
        <p className="text-xs text-slate-400 mt-1">{user?.tenantId ? 'Gym Admin' : 'SaaS Admin'}</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="mr-3 text-xl">{item.icon}</span>
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold mr-3">
                {user?.name?.charAt(0) || 'A'}
            </div>
            <div className="overflow-hidden">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
        </div>
        <button
          onClick={logout}
          className="w-full bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white py-2 px-4 rounded transition-all text-sm font-medium flex items-center justify-center"
        >
          <span>🚪 Cerrar Sesión</span>
        </button>
      </div>
    </div>
  );
}
