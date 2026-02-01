'use client';

import { useAuth } from '@/context/auth-context';
import Link from 'next/link';

export default function Dashboard() {
  const { user, logout, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-8 border-b pb-4">
          <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
          <div className="flex gap-4">
            <Link 
              href="/access" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-bold transition-colors"
            >
              Control de Acceso (QR)
            </Link>
            <button
              onClick={logout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
            <h2 className="text-xl font-semibold mb-4 text-blue-800">Información del Usuario</h2>
            <div className="space-y-3">
              <div>
                <span className="text-gray-500 text-sm block">Nombre</span>
                <span className="font-medium">{user?.name}</span>
              </div>
              <div>
                <span className="text-gray-500 text-sm block">Email</span>
                <span className="font-medium">{user?.email}</span>
              </div>
              <div>
                <span className="text-gray-500 text-sm block">Rol</span>
                <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-semibold mt-1">
                  {user?.role}
                </span>
              </div>
              <div>
                <span className="text-gray-500 text-sm block">Tenant ID</span>
                <code className="text-xs bg-gray-100 p-1 rounded">{user?.tenantId || 'N/A'}</code>
              </div>
            </div>
          </div>

          <div className="bg-green-50 p-6 rounded-lg border border-green-100">
            <h2 className="text-xl font-semibold mb-4 text-green-800">Estado del Sistema</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Estado de Conexión</span>
                <span className="text-green-600 font-bold">Online</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Versión</span>
                <span className="font-mono text-sm">v1.0.0</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
