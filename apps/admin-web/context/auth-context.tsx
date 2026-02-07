'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Cookies from 'js-cookie';
import api from '@/lib/api';
import { useAlert } from '@/components/ui/CustomAlert';
import { useTranslation } from 'react-i18next';

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
  login: (userData: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children, initialUser }: { children: React.ReactNode; initialUser: User | null }) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { showAlert } = useAlert();
  const { t } = useTranslation();

  // Setup Axios Interceptor for 401s
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // If 401, token expired or invalid
          // Only show alert if we actually had a user session
          if (user) {
            showAlert('warning', t('auth.sessionExpired') || 'Se acabó el tiempo de autenticación, por favor iniciar sesión de nuevo');
            logout();
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, [user, router, showAlert, t]);

  // Proactive Token Expiration Check
  useEffect(() => {
    const checkTokenExpiration = () => {
      const token = Cookies.get('token');
      if (!token) return;

      try {
        // Simple JWT decode without external library
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const { exp } = JSON.parse(jsonPayload);
        
        if (!exp) return;

        const currentTime = Date.now();
        const expirationTime = exp * 1000;
        const timeRemaining = expirationTime - currentTime;

        if (timeRemaining <= 0) {
          // Already expired
          logout();
        } else {
          // Set timeout to logout when expired
          const timer = setTimeout(() => {
            showAlert('warning', t('auth.sessionExpired') || 'Tu sesión ha expirado');
            logout();
          }, timeRemaining);
          
          return () => clearTimeout(timer);
        }
      } catch (e) {
        console.error('Error checking token expiration', e);
      }
    };

    const cleanup = checkTokenExpiration();
    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
  }, [user]); // Re-run when user changes (login/logout)

  useEffect(() => {
    const publicRoutes = ['/login', '/forgot-password'];
    // If not loading, no user, and not on a public route -> redirect to login
    if (!loading && !user && !publicRoutes.includes(pathname)) {
      // Clear invalid token to prevent middleware redirect loop
      Cookies.remove('token');
      router.push('/login');
    }
  }, [user, loading, pathname, router]);

  const login = (userData: User) => {
    // Cookie is set by server
    setUser(userData);
    router.push('/dashboard');
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error('Logout failed', e);
    }
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
