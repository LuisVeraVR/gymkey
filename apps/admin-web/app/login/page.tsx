'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import api from '@/lib/api';
import { QRCodeSVG } from 'qrcode.react';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useAlert } from '@/components/ui/CustomAlert';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';
import { Moon, Sun, Globe, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { showAlert } = useAlert();
  const { setTheme, resolvedTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  const [step, setStep] = useState<'login' | 'mfa_verify' | 'mfa_setup' | 'password_change' | 'forgot_password'>('login');
  const [direction, setDirection] = useState(0);
  const [tempToken, setTempToken] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [canSkip, setCanSkip] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mfaAttempts, setMfaAttempts] = useState(0);

  // Forgot Password State
  const [fpEmail, setFpEmail] = useState('');
  const [fpSubmitted, setFpSubmitted] = useState(false);

  const fetchMfaSecret = async (token: string) => {
      try {
          const { data } = await api.post('/auth/mfa/generate', {}, {
              headers: { Authorization: `Bearer ${token}` }
          });
          setOtpauthUrl(data.otpauthUrl);
      } catch (err) {
          showAlert('error', 'Error al generar MFA secret');
      }
  };

  const handleAuthResponse = async (data: unknown) => {
      if (typeof data !== 'object' || data === null) {
          showAlert('error', 'Respuesta inválida del servidor');
          return;
      }
      const payload = data as {
          passwordChangeRequired?: boolean;
          mfaRequired?: boolean;
          mfaSetupRequired?: boolean;
          mfaSetupSuggested?: boolean;
          tempToken?: string;
          user?: Parameters<typeof login>[0];
      };

      if (payload.passwordChangeRequired) {
          setTempToken(payload.tempToken || '');
          setDirection(1);
          setStep('password_change');
          return;
      }
      
      if (payload.mfaRequired) {
          setTempToken(payload.tempToken || '');
          setDirection(1);
          setStep('mfa_verify');
          setMfaAttempts(0); // Reset attempts on new MFA requirement
          return;
      }
      
      if (payload.mfaSetupRequired) {
          setTempToken(payload.tempToken || '');
          if (payload.tempToken) await fetchMfaSecret(payload.tempToken);
          setDirection(1);
          setStep('mfa_setup');
          setCanSkip(false);
          return;
      }
      
      if (payload.mfaSetupSuggested) {
          setTempToken(payload.tempToken || '');
          if (payload.tempToken) await fetchMfaSecret(payload.tempToken);
          setDirection(1);
          setStep('mfa_setup');
          setCanSkip(true);
          return;
      }

      if (payload.user) {
          login(payload.user);
          return;
      }
      showAlert('error', 'No se recibió información de usuario');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Minimum loading time (3 seconds) for pro feel
    const minLoadTime = new Promise(resolve => setTimeout(resolve, 3000));
    
    try {
      const [authResponse] = await Promise.all([
        api.post('/auth/admin/login', { email, password }),
        minLoadTime
      ]);
      
      const { data } = authResponse;
      await handleAuthResponse(data);
      setIsLoading(false);
    } catch (err: unknown) {
      // Ensure we waited the minimum time even on error
      await minLoadTime;
      
      const maybeError = err as { response?: { status?: number; data?: { message?: string } } };
      console.error(err);
      if (maybeError.response?.status === 401) {
        showAlert('error', maybeError.response.data?.message || 'Credenciales invalidas');
      } else {
        showAlert('error', 'Error al conectar con el servidor');
      }
      setIsLoading(false);
    }
  };
  
  const handlePasswordChange = async (e: React.FormEvent) => {
      e.preventDefault();
      if (newPassword !== confirmPassword) {
          showAlert('error', 'Las contraseñas no coinciden');
          return;
      }
      
      setIsLoading(true);
      
      try {
          const { data } = await api.post('/auth/change-password', { password: newPassword }, {
              headers: { Authorization: `Bearer ${tempToken}` }
          });
          await handleAuthResponse(data);
          setIsLoading(false);
      } catch (err: unknown) {
          const maybeError = err as { response?: { data?: { message?: string } } };
          showAlert('error', maybeError.response?.data?.message || 'Error al cambiar contraseña');
          setIsLoading(false);
      }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      
      try {
          const { data } = await api.post('/auth/mfa/verify-login', { token: mfaCode }, {
              headers: { Authorization: `Bearer ${tempToken}` }
          });
          login(data.user);
      } catch (err: unknown) {
          setIsLoading(false);
          
          const maybeError = err as { response?: { status?: number } };
          if (maybeError.response?.status === 401 || maybeError.response?.status === 403) {
              // Token expired or invalid
              showAlert('error', 'El tiempo para ingresar el código ha expirado, por favor inicie sesión de nuevo');
              setDirection(-1);
              setStep('login');
              setTempToken('');
              setMfaCode('');
              return;
          }

          // Increment attempts on other errors (like invalid code)
          const newAttempts = mfaAttempts + 1;
          setMfaAttempts(newAttempts);

          if (newAttempts >= 3) {
              showAlert('error', 'Has excedido el número de intentos permitidos. Por favor inicie sesión de nuevo.');
              setDirection(-1);
              setStep('login');
              setTempToken('');
              setMfaCode('');
          } else {
              const remaining = 3 - newAttempts;
              showAlert('error', `Código inválido. Intentos restantes: ${remaining}`);
          }
      }
  };

  const handleMfaEnable = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      
      try {
          const { data } = await api.post('/auth/mfa/enable', { token: mfaCode }, {
              headers: { Authorization: `Bearer ${tempToken}` }
          });
          login(data.user);
      } catch (err: unknown) {
          const maybeError = err as { response?: { data?: { message?: string } } };
          showAlert('error', maybeError.response?.data?.message || 'Código inválido');
          setIsLoading(false);
      }
  };

  const handleSkip = async () => {
      setIsLoading(true);
      try {
          const { data } = await api.post('/auth/mfa/skip', {}, {
              headers: { Authorization: `Bearer ${tempToken}` }
          });
          login(data.user);
      } catch (err) {
          showAlert('error', 'Error al omitir MFA');
          setIsLoading(false);
      }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await api.post('/auth/forgot-password', { email: fpEmail });
      setFpSubmitted(true);
    } catch (err) {
      showAlert('error', 'Si el correo existe, recibirás instrucciones');
      setFpSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : direction < 0 ? -50 : 0,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 50 : direction > 0 ? -50 : 0,
      opacity: 0
    })
  };

  const isForgotStep = step === 'forgot_password';

  // Shared Forms Content
  const LoginFormContent = (
    <div className="w-full max-w-sm mx-auto space-y-8">
      <div className="space-y-2 text-center lg:text-left">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          {step === 'login' && 'Bienvenido de nuevo'}
          {step === 'password_change' && 'Cambio de Contraseña'}
          {step === 'mfa_verify' && 'Verificación de dos pasos'}
          {step === 'mfa_setup' && 'Configura 2FA'}
        </h2>
        <p className="text-muted-foreground">
          {step === 'login' && 'Ingresa tus credenciales para acceder'}
          {step === 'password_change' && 'Por seguridad, debes cambiar tu contraseña'}
          {step === 'mfa_verify' && 'Ingresa el código de tu aplicación'}
          {step === 'mfa_setup' && 'Escanea el código QR para continuar'}
        </p>
      </div>

      {step === 'login' && (
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
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
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">Contraseña</label>
                  <button 
                    type="button"
                    onClick={() => {
                      setStep('forgot_password');
                      setDirection(1);
                      setFpSubmitted(false);
                    }}
                    className="text-sm font-medium text-primary hover:text-primary-hover transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-8 px-2 pr-10 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-primary hover:bg-primary-hover text-primary-foreground font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>
      )}

      {step === 'password_change' && (
          <form onSubmit={handlePasswordChange} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Nueva Contraseña</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-8 px-2 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Confirmar Contraseña</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-8 px-2 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-primary hover:bg-primary-hover text-primary-foreground font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Cambiando...' : 'Cambiar Contraseña'}
            </button>
            
            <button 
              type="button" 
              onClick={() => {
                setDirection(-1);
                setStep('login');
                setTempToken('');
              }}
              className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver al inicio
            </button>
          </form>
      )}
      
      {step === 'mfa_verify' && (
          <form onSubmit={handleMfaVerify} className="space-y-6">
            <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Código de autenticación</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  className="w-full h-8 px-2 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-center text-lg tracking-widest"
                  placeholder="000000"
                />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-primary hover:bg-primary-hover text-primary-foreground font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Verificando...' : 'Verificar'}
            </button>

            <button 
              type="button" 
              onClick={() => {
                setDirection(-1);
                setStep('login');
                setTempToken('');
              }}
              className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver al inicio
            </button>
          </form>
      )}

      {step === 'mfa_setup' && (
          <form onSubmit={handleMfaEnable} className="space-y-6">
            <div className="flex justify-center p-4 bg-white rounded-xl">
                {otpauthUrl && <QRCodeSVG value={otpauthUrl} size={200} />}
            </div>
            
            <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Código de verificación</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  className="w-full h-8 px-2 bg-card border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-center text-lg tracking-widest"
                  placeholder="000000"
                />
            </div>

            <div className="space-y-3">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 bg-primary hover:bg-primary-hover text-primary-foreground font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Activando...' : 'Activar 2FA'}
                </button>
                
                {canSkip && (
                    <button
                      type="button"
                      onClick={handleSkip}
                      disabled={isLoading}
                      className="w-full h-11 bg-transparent hover:bg-muted text-muted-foreground font-medium rounded-lg transition-colors focus:outline-none"
                    >
                      Omitir por ahora
                    </button>
                )}

                <button 
                  type="button" 
                  onClick={() => {
                    setDirection(-1);
                    setStep('login');
                    setTempToken('');
                  }}
                  className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Volver al inicio
                </button>
            </div>
          </form>
      )}
    </div>
  );

  const ForgotFormContent = (
    <div className="w-full max-w-sm mx-auto space-y-8">
      <div className="space-y-2 text-center lg:text-left">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          ¿Olvidaste tu contraseña?
        </h2>
        <p className="text-muted-foreground">
          Ingresa tu correo electrónico y te enviaremos instrucciones.
        </p>
      </div>

      {!fpSubmitted ? (
        <form onSubmit={handleForgotPassword} className="space-y-6">
            <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email</label>
                <input
                    type="email"
                    required
                    value={fpEmail}
                    onChange={(e) => setFpEmail(e.target.value)}
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

            <button 
              type="button" 
              onClick={() => {
                setDirection(-1);
                setStep('login');
              }}
              className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver al inicio
            </button>
        </form>
      ) : (
        <div className="space-y-6 text-center lg:text-left animate-fadeIn">
            <div className="p-4 bg-green-500/10 text-green-600 rounded-lg text-sm font-medium">
                Si el correo existe en nuestra base de datos, recibirás un email con las instrucciones.
            </div>
            <button 
              type="button" 
              onClick={() => {
                setDirection(-1);
                setStep('login');
              }}
              className="block w-full h-11 leading-10 text-center bg-muted hover:bg-muted/80 text-foreground font-medium rounded-lg transition-colors"
            >
                Volver al inicio de sesión
            </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex overflow-hidden relative">
      <AnimatePresence>
        {isLoading && <LoadingScreen />}
      </AnimatePresence>

      {/* Theme & Language Toggles - Absolute Top Right */}
      {mounted && (
        <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
          <div className="flex items-center gap-1 bg-background/50 backdrop-blur-sm p-1.5 rounded-full border border-border/20 hover:bg-background/80 hover:border-border/40 transition-all duration-300">
             {/* Language Toggle */}
            <button
              onClick={() => {
                const newLang = i18n.language === 'es' ? 'en' : 'es';
                i18n.changeLanguage(newLang);
              }}
              className="p-2 rounded-full hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors group relative"
              title={t('settings.language')}
            >
              <Globe className="w-4 h-4" />
              <span className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-full hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
              title={resolvedTheme === 'dark' ? t('settings.lightMode') : t('settings.darkMode')}
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* MOBILE LAYOUT: Stacked, simple conditional render */}
      <div className="lg:hidden flex-1 flex flex-col justify-center px-8 sm:px-12 py-12">
        <AnimatePresence mode="wait" custom={direction}>
           <motion.div
             key={isForgotStep ? 'forgot' : 'login'}
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             exit={{ opacity: 0, x: -20 }}
             className="w-full"
           >
             {isForgotStep ? ForgotFormContent : LoginFormContent}
           </motion.div>
        </AnimatePresence>
      </div>

      {/* DESKTOP LAYOUT: Sliding Overlay */}
      <div className="hidden lg:block absolute inset-0 w-full h-full">
         {/* Underlay: Two Columns */}
         <div className="absolute inset-0 grid grid-cols-2 w-full h-full">
            {/* Left Slot: Login / MFA / Password Change */}
            <div className={`flex flex-col justify-center px-24 xl:px-32 h-full transition-all duration-700 ${isForgotStep ? 'opacity-0 scale-95 pointer-events-none blur-sm' : 'opacity-100 scale-100 blur-0'}`}>
                {LoginFormContent}
            </div>

            {/* Right Slot: Forgot Password */}
            <div className={`flex flex-col justify-center px-24 xl:px-32 h-full transition-all duration-700 ${!isForgotStep ? 'opacity-0 scale-95 pointer-events-none blur-sm' : 'opacity-100 scale-100 blur-0'}`}>
                {ForgotFormContent}
            </div>
         </div>

         {/* Overlay Panel - Slides between Left and Right */}
         <motion.div
            initial={false}
            animate={{ x: isForgotStep ? '0%' : '100%' }}
            transition={{ type: "spring", stiffness: 70, damping: 15, mass: 1 }}
            className="absolute top-0 left-0 w-1/2 h-full bg-zinc-900 z-20 overflow-hidden shadow-2xl"
         >
            {/* Dynamic Background */}
            <motion.div 
                key={isForgotStep ? 'fp-bg' : 'login-bg'}
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 0.4, scale: 1 }}
                transition={{ duration: 1.2 }}
                className="absolute inset-0 bg-cover bg-center mix-blend-overlay"
                style={{ 
                  backgroundImage: isForgotStep 
                    ? "url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop')"
                    : "url('https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=2070&auto=format&fit=crop')" 
                }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-transparent to-zinc-900/80" />

            {/* Branding Content */}
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

              <AnimatePresence mode="wait">
                {isForgotStep ? (
                  <motion.div 
                    key="fp-content"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-6"
                  >
                    <h1 className="text-4xl font-bold text-white leading-tight text-balance drop-shadow-lg">
                      Recupera tu acceso
                    </h1>
                    <p className="text-lg text-zinc-300 max-w-md drop-shadow-md">
                      Te ayudaremos a restablecer tu contraseña para que puedas volver a gestionar tu gimnasio.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="login-content"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-6"
                  >
                    <h1 className="text-4xl font-bold text-white leading-tight text-balance drop-shadow-lg">
                      El control total de tu gimnasio en un solo lugar
                    </h1>
                    <p className="text-lg text-zinc-300 max-w-md drop-shadow-md">
                      Gestiona accesos, usuarios, pagos y rutinas con la plataforma mas moderna del mercado.
                    </p>
                    
                    {/* Feature highlights */}
                    <div className="space-y-4 pt-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 backdrop-blur-sm flex items-center justify-center">
                          <svg className="w-4 h-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <span className="text-sm text-zinc-300">Control de acceso en tiempo real</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 backdrop-blur-sm flex items-center justify-center">
                          <svg className="w-4 h-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <span className="text-sm text-zinc-300">Gestion completa de membresias</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 backdrop-blur-sm flex items-center justify-center">
                          <svg className="w-4 h-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <span className="text-sm text-zinc-300">Auditoria y reportes avanzados</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <span>© 2026 GymKey Inc.</span>
                <span>•</span>
                <span>v1.0.0</span>
              </div>
            </div>
         </motion.div>
      </div>
    </div>
  );

}
