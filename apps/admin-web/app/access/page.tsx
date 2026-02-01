'use client';

import { useState, useRef, useEffect } from 'react';
import api from '@/lib/api';

interface ValidationResult {
  valid: boolean;
  reason?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    photo: string | null;
    status: string;
    membershipExpires?: string;
  };
}

interface AccessLog {
  id: string;
  userName: string;
  userEmail: string;
  status: 'granted' | 'denied';
  reason?: string;
  timestamp: string;
}

function AccessLogItem({ log }: { log: AccessLog }) {
  return (
    <div className="flex items-center gap-4 p-4 hover:bg-muted/20 transition-colors rounded-lg">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
        log.status === 'granted' ? 'bg-success/10' : 'bg-destructive/10'
      }`}>
        {log.status === 'granted' ? (
          <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-5 h-5 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{log.userName}</p>
        <p className="text-xs text-muted-foreground truncate">{log.userEmail}</p>
      </div>
      <div className="text-right">
        <span className={`text-xs font-medium px-2 py-1 rounded ${
          log.status === 'granted' 
            ? 'bg-success/10 text-success' 
            : 'bg-destructive/10 text-destructive'
        }`}>
          {log.status === 'granted' ? 'Acceso' : 'Denegado'}
        </span>
        <p className="text-xs text-muted-foreground mt-1">{log.timestamp}</p>
      </div>
    </div>
  );
}

export default function AccessControlPage() {
  const [token, setToken] = useState('');
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([
    { id: '1', userName: 'Carlos Rodriguez', userEmail: 'carlos@ejemplo.com', status: 'granted', timestamp: 'Hace 2 min' },
    { id: '2', userName: 'Maria Garcia', userEmail: 'maria@ejemplo.com', status: 'granted', timestamp: 'Hace 5 min' },
    { id: '3', userName: 'Juan Martinez', userEmail: 'juan@ejemplo.com', status: 'denied', reason: 'Membresia vencida', timestamp: 'Hace 8 min' },
    { id: '4', userName: 'Ana Lopez', userEmail: 'ana@ejemplo.com', status: 'granted', timestamp: 'Hace 12 min' },
    { id: '5', userName: 'Pedro Sanchez', userEmail: 'pedro@ejemplo.com', status: 'granted', timestamp: 'Hace 15 min' },
    { id: '6', userName: 'Laura Torres', userEmail: 'laura@ejemplo.com', status: 'denied', reason: 'Usuario suspendido', timestamp: 'Hace 20 min' },
  ]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [result]);

  const handleValidate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!token.trim()) return;

    setLoading(true);
    setResult(null);
    setError('');

    try {
      const { data } = await api.post('/access-keys/validate', { token });
      setResult(data);
      setToken('');
      
      // Add to local logs
      if (data.user) {
        const newLog: AccessLog = {
          id: Date.now().toString(),
          userName: data.user.name,
          userEmail: data.user.email,
          status: data.valid ? 'granted' : 'denied',
          reason: data.reason,
          timestamp: 'Ahora'
        };
        setAccessLogs(prev => [newLog, ...prev.slice(0, 9)]);
      }
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 401) {
        setError(err.response.data.message || 'Error de autorizacion');
      } else {
        setError('Error de conexion o token invalido');
      }
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const clearResult = () => {
    setResult(null);
    setError('');
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Control de Acceso</h1>
        <p className="text-muted-foreground mt-1">Valida el acceso de usuarios mediante codigo QR o token</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Scanner Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Scanner Card */}
          <div className="bg-card border border-border rounded-xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Escanear Codigo</h3>
                <p className="text-sm text-muted-foreground">Escanea o ingresa el token de acceso</p>
              </div>
            </div>

            <form onSubmit={handleValidate} className="space-y-4">
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Escanea el codigo QR aqui..."
                  className="w-full h-14 px-5 bg-background border-2 border-border rounded-xl text-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                  autoComplete="off"
                />
                {token && (
                  <button
                    type="button"
                    onClick={() => setToken('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              
              <button
                type="submit"
                disabled={loading || !token.trim()}
                className="w-full h-12 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Validando...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    VALIDAR ACCESO
                  </>
                )}
              </button>
            </form>

            {error && (
              <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3 animate-fadeIn">
                <svg className="w-5 h-5 text-destructive flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </div>

          {/* Result Display */}
          {result && (
            <div className={`rounded-xl border-2 overflow-hidden animate-slideInUp ${
              result.valid 
                ? 'bg-success/5 border-success' 
                : 'bg-destructive/5 border-destructive'
            }`}>
              {/* Result Header */}
              <div className={`p-6 text-center ${result.valid ? 'bg-success/10' : 'bg-destructive/10'}`}>
                <div className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${
                  result.valid ? 'bg-success' : 'bg-destructive'
                }`}>
                  {result.valid ? (
                    <svg className="w-10 h-10 text-success-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-10 h-10 text-destructive-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
                <h2 className={`text-3xl font-bold ${result.valid ? 'text-success' : 'text-destructive'}`}>
                  {result.valid ? 'ACCESO PERMITIDO' : 'ACCESO DENEGADO'}
                </h2>
                {result.reason && (
                  <p className="text-lg text-destructive mt-2 font-medium">{result.reason}</p>
                )}
              </div>

              {/* User Info */}
              {result.user && (
                <div className="p-6 bg-card">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
                      {result.user.photo ? (
                        <img 
                          src={result.user.photo} 
                          alt={result.user.name} 
                          className="w-full h-full rounded-full object-cover" 
                        />
                      ) : (
                        result.user.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-foreground">{result.user.name}</h3>
                      <p className="text-muted-foreground">{result.user.email}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-xs font-medium px-2 py-1 rounded ${
                          result.user.status === 'ACTIVE' 
                            ? 'bg-success/10 text-success' 
                            : 'bg-destructive/10 text-destructive'
                        }`}>
                          {result.user.status}
                        </span>
                        <span className="text-xs font-medium px-2 py-1 rounded bg-primary/10 text-primary">
                          {result.user.role}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={clearResult}
                      className="h-10 px-4 bg-secondary hover:bg-secondary-hover text-secondary-foreground text-sm font-medium rounded-lg transition-colors"
                    >
                      Nuevo Escaneo
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Instructions (show when no result) */}
          {!result && !loading && (
            <div className="bg-card border border-border rounded-xl p-6">
              <h4 className="font-semibold text-foreground mb-4">Instrucciones de uso</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold flex-shrink-0">1</div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Escanear QR</p>
                    <p className="text-xs text-muted-foreground">El usuario muestra su codigo QR</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold flex-shrink-0">2</div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Validar</p>
                    <p className="text-xs text-muted-foreground">El sistema verifica el acceso</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-bold flex-shrink-0">3</div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Resultado</p>
                    <p className="text-xs text-muted-foreground">Se muestra si puede entrar o no</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Access Log Sidebar */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Historial de Accesos</h3>
            <span className="text-xs text-muted-foreground">Ultimos 10</span>
          </div>
          <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
            {accessLogs.map((log) => (
              <AccessLogItem key={log.id} log={log} />
            ))}
          </div>
          <div className="p-4 border-t border-border">
            <button className="w-full h-9 text-sm text-primary hover:text-primary-hover transition-colors">
              Ver historial completo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
