'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type AlertType = 'success' | 'error' | 'info' | 'warning';

interface Alert {
  id: string;
  type: AlertType;
  message: string;
  duration?: number;
}

interface AlertContextType {
  showAlert: (type: AlertType, message: string, duration?: number) => void;
  removeAlert: (id: string) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  }, []);

  const showAlert = useCallback((type: AlertType, message: string, duration = 5000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setAlerts((prev) => [...prev, { id, type, message, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        removeAlert(id);
      }, duration);
    }
  }, [removeAlert]);

  return (
    <AlertContext.Provider value={{ showAlert, removeAlert }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`
              pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg min-w-[300px] max-w-md animate-slideInRight
              ${
                alert.type === 'success' ? 'bg-green-500 text-white' :
                alert.type === 'error' ? 'bg-red-500 text-white' :
                alert.type === 'warning' ? 'bg-yellow-500 text-white' :
                'bg-blue-500 text-white'
              }
            `}
          >
            <div className="flex-shrink-0">
              {alert.type === 'success' && <CheckCircle className="w-5 h-5" />}
              {alert.type === 'error' && <AlertCircle className="w-5 h-5" />}
              {alert.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
              {alert.type === 'info' && <Info className="w-5 h-5" />}
            </div>
            <p className="text-sm font-medium flex-1">{alert.message}</p>
            <button
              onClick={() => removeAlert(alert.id)}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </AlertContext.Provider>
  );
}
