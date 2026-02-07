'use client';

import { useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAlert } from '@/components/ui/CustomAlert';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { showAlert } = useAlert();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await api.post('/auth/forgot-password', { email });
      setIsSubmitted(true);
    } catch (err) {
      // Even if it fails (security), we might want to show success or generic error.
      // But for now, let's show success to avoid enumeration, or handle error if it's network related.
      // If it's 404, we shouldn't tell.
      showAlert('error', 'Si el correo existe, recibirás instrucciones');
      setIsSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Form */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-24 xl:px-32">
        <div className="w-full max-w-sm mx-auto space-y-8">
            <div className="space-y-2 text-center lg:text-left">
                <h2 className="text-3xl font-bold tracking-tight text-foreground">
                    ¿Olvidaste tu contraseña?
                </h2>
                <p className="text-muted-foreground">
                    Ingresa tu correo electrónico y te enviaremos instrucciones para restablecerla.
                </p>
            </div>

            {!isSubmitted ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full h-8 px-2 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            placeholder="admin@gymkey.com"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-11 bg-primary hover:bg-primary-hover text-primary-foreground font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Enviando...' : 'Enviar instrucciones'}
                    </button>

                    <div className="text-center">
                        <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                            Volver al inicio de sesión
                        </Link>
                    </div>
                </form>
            ) : (
                <div className="space-y-6 text-center lg:text-left animate-fadeIn">
                    <div className="p-4 bg-green-500/10 text-green-600 rounded-lg text-sm font-medium">
                        Si el correo existe en nuestra base de datos, recibirás un email con las instrucciones.
                    </div>
                    <Link href="/login" className="block w-full h-11 leading-10 text-center bg-muted hover:bg-muted/80 text-foreground font-medium rounded-lg transition-colors">
                        Volver al inicio de sesión
                    </Link>
                </div>
            )}
        </div>
      </div>

      {/* Right side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-zinc-900 relative overflow-hidden">
        {/* Background Image & Overlay */}
        <div 
            className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-overlay"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-transparent to-zinc-900/80" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full h-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/90 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <svg className="w-6 h-6 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-white tracking-tight drop-shadow-md">
              Gym<span className="text-primary">Key</span>
            </span>
          </div>

          <div className="space-y-6">
            <h1 className="text-4xl font-bold text-white leading-tight text-balance drop-shadow-lg">
              Recupera tu acceso
            </h1>
            <p className="text-lg text-zinc-300 max-w-md drop-shadow-md">
              Te ayudaremos a restablecer tu contraseña para que puedas volver a gestionar tu gimnasio.
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <span>© 2026 GymKey Inc.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
