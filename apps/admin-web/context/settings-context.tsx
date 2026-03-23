'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from './auth-context';
import { useSocket } from './socket-context';

interface SettingsConfig {
  currency: string;
  locale: string;
  [key: string]: unknown;
}

interface Settings {
  name: string;
  slug: string;
  config: SettingsConfig;
}

interface SettingsContextType {
  settings: Settings | null;
  currency: string;
  locale: string;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { socket } = useSocket();

  const fetchSettings = async () => {
    try {
      const res = await api.get<Settings>('/settings');
      setSettings(res.data);
      // Cache currency for immediate access
      if (res.data?.config?.currency) {
        localStorage.setItem('gymkey_currency', res.data.config.currency);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      // Fallback to cached currency if available
      const cachedCurrency = localStorage.getItem('gymkey_currency');
      if (cachedCurrency) {
        setSettings((prev) => prev ? { ...prev, config: { ...prev.config, currency: cachedCurrency } } : {
            name: 'Gym',
            slug: 'gym',
            config: { currency: cachedCurrency, locale: 'en-US' }
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSettings();
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!socket) return;

    const handleSettingsUpdate = (data: unknown) => {
      if (typeof data !== 'object' || data === null) return;
      setSettings((prev) => {
        const incoming = data as Partial<Settings>;
        if (!prev) return incoming as Settings;
        return {
          ...prev,
          ...incoming,
          config: {
            ...prev.config,
            ...(incoming.config || {}),
          }
        };
      });

      const incoming = data as Partial<Settings>;
      if (incoming.config?.currency) {
        localStorage.setItem('gymkey_currency', incoming.config.currency);
      }
    };

    socket.on('settings_updated', handleSettingsUpdate);

    return () => {
      socket.off('settings_updated', handleSettingsUpdate);
    };
  }, [socket]);

  const value = {
    settings,
    currency: settings?.config?.currency || 'USD',
    locale: settings?.config?.locale || 'en-US',
    loading,
    refreshSettings: fetchSettings,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
