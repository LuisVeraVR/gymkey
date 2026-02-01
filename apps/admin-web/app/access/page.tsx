'use client';

import { useState, useRef, useEffect } from 'react';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';

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
  };
}

export default function AccessControlPage() {
  const [token, setToken] = useState('');
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Auto-focus input on mount and after validation
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
      
      // Clear input for next scan if valid, or keep if invalid? 
      // Usually clear to be ready for next person
      setToken('');
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 401) {
         // Invalid token format or auth error
         setError(err.response.data.message || 'Error de autorización');
      } else {
         setError('Error de conexión o token inválido');
      }
    } finally {
      setLoading(false);
      // Keep focus
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Control de Acceso</h1>
            <button 
                onClick={() => router.push('/dashboard')}
                className="text-gray-600 hover:text-gray-900"
            >
                &larr; Volver al Dashboard
            </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <form onSubmit={handleValidate} className="flex gap-4">
            <input
              ref={inputRef}
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Escanea el código QR aquí..."
              className="flex-1 p-4 border-2 border-gray-300 rounded-lg text-lg focus:border-blue-500 focus:outline-none"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Validando...' : 'VALIDAR'}
            </button>
          </form>
          {error && <p className="text-red-500 mt-2 font-medium">{error}</p>}
        </div>

        {result && (
          <div className={`p-8 rounded-xl shadow-lg text-center ${result.valid ? 'bg-green-100 border-4 border-green-500' : 'bg-red-100 border-4 border-red-500'}`}>
            <h2 className={`text-4xl font-black mb-4 ${result.valid ? 'text-green-700' : 'text-red-700'}`}>
              {result.valid ? 'ACCESO PERMITIDO' : 'ACCESO DENEGADO'}
            </h2>
            
            {result.reason && (
                <p className="text-2xl font-bold text-red-600 mb-4">{result.reason}</p>
            )}

            {result.user && (
              <div className="bg-white/80 p-6 rounded-lg inline-block min-w-[300px]">
                <div className="w-32 h-32 bg-gray-300 rounded-full mx-auto mb-4 overflow-hidden">
                  {/* Placeholder for user photo */}
                  {result.user.photo ? (
                      <img src={result.user.photo} alt={result.user.name} className="w-full h-full object-cover" />
                  ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl text-gray-500">
                          {result.user.name.charAt(0)}
                      </div>
                  )}
                </div>
                <h3 className="text-2xl font-bold text-gray-800">{result.user.name}</h3>
                <p className="text-gray-600">{result.user.email}</p>
                <div className="mt-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${result.user.status === 'ACTIVE' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                        {result.user.status}
                    </span>
                    <span className="ml-2 px-3 py-1 rounded-full text-sm font-bold bg-blue-200 text-blue-800">
                        {result.user.role}
                    </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
