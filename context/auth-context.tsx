'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Cookies from 'js-cookie';
import api from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const initAuth = async () => {
      const token = Cookies.get('token');
      if (!token) {
        setLoading(false);
        if (pathname !== '/login') {
          // Si no hay token y no estamos en login, redirigir
          // Nota: Middleware se encarga de esto, pero doble check no daña
        }
        return;
      }

      try {
        // Validar token y obtener usuario actualizado
        const { data } = await api.get('/auth/me');
        setUser(data);
      } catch (error) {
        console.error('Session expired', error);
        logout();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = (token: string, userData: User) => {
    Cookies.set('token', token, { expires: 1 }); // 1 dia
    setUser(userData);
    router.push('/dashboard');
  };

  const logout = () => {
    Cookies.remove('token');
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
