import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import axios from 'axios';
import { API_BASE_URL, authClient } from '../api';
import { useTheme } from '../context/ThemeContext';
import { spacing, radius, fontSize } from '../theme';
import { Text } from './ui/Text';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { OtpInput } from './ui/OtpInput';
import { PasswordStrength } from './ui/PasswordStrength';

/* ─── Types ───────────────────────────── */

type PostLogin =
  | 'done'
  | { step: 'mfa'; tempToken: string }
  | { step: 'password'; tempToken: string }
  | { step: 'mfaSetup'; tempToken: string };

type AuthScreen = 'welcome' | 'login' | 'forgot';
type ActiveView = AuthScreen | 'mfa' | 'password';
type ThemeColors = ReturnType<typeof useTheme>['colors'];

/* ─── Layout constants ────────────────── */

const BLEND_ZONE = 80;
const CARD_OVERLAP = 48;
const CARD_RADIUS = radius['2xl'];

const HERO_IMAGES: Record<ActiveView, string> = {
  welcome:
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1200&auto=format&fit=crop',
  login:
    'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1200&auto=format&fit=crop',
  forgot:
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1200&auto=format&fit=crop',
  mfa:
    'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1200&auto=format&fit=crop',
  password:
    'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1200&auto=format&fit=crop',
};

const HERO_CONTENT: Record<ActiveView, { title: string; subtitle: string; fraction: number }> = {
  welcome: {
    title: 'Tu gimnasio,\nsiempre contigo',
    subtitle: 'Acceso, rutinas, pagos y más en una sola app.',
    fraction: 0.38,
  },
  login: {
    title: 'Bienvenido\nde vuelta',
    subtitle: 'QR, rutinas, clases y pagos en un solo lugar.',
    fraction: 0.32,
  },
  forgot: {
    title: 'Recupera tu\nacceso',
    subtitle: 'Te enviaremos instrucciones por correo.',
    fraction: 0.30,
  },
  mfa: {
    title: 'Verificación',
    subtitle: 'Un paso más para proteger tu cuenta.',
    fraction: 0.28,
  },
  password: {
    title: 'Nueva contraseña',
    subtitle: 'Por seguridad, crea una contraseña nueva.',
    fraction: 0.28,
  },
};

/* ─── Pure helpers ─────────────────────── */

function formatAuthError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (!err.response && (err.code === 'ERR_NETWORK' || err.message === 'Network Error')) {
      return `Sin conexión con el servidor (${API_BASE_URL}). ¿La API está en marcha?`;
    }
    const data = err.response?.data;
    if (data && typeof data === 'object' && 'message' in data) {
      const m = (data as { message: unknown }).message;
      if (typeof m === 'string') {
        if (m === 'Unauthorized') {
          return 'Sesión no válida o expirada. Si abriste el admin en este dispositivo, cierra sesión allí y vuelve a entrar.';
        }
        return m;
      }
      if (Array.isArray(m)) return m.filter((x) => typeof x === 'string').join(', ');
    }
    if (err.response?.status === 401) return 'Credenciales inválidas';
    return err.message || 'Error al iniciar sesión';
  }
  if (err instanceof Error) return err.message;
  return 'Error al iniciar sesión';
}

async function consumeLoginPayload(
  data: Record<string, unknown>,
  signIn: (t: string) => Promise<void>,
): Promise<PostLogin> {
  const trySkipMfaSetup = async (tempToken: string) => {
    const r = await authClient.post(
      '/auth/mfa/skip',
      {},
      { headers: { Authorization: `Bearer ${tempToken}` } },
    );
    const at = r.data?.access_token;
    if (typeof at === 'string') {
      await signIn(at);
      return 'done' as const;
    }
    throw new Error('Sin access_token tras continuar sin MFA');
  };

  if (typeof data.access_token === 'string') {
    await signIn(data.access_token);
    return 'done';
  }
  if (data.passwordChangeRequired && typeof data.tempToken === 'string')
    return { step: 'password', tempToken: data.tempToken };
  if (data.mfaRequired && typeof data.tempToken === 'string')
    return { step: 'mfa', tempToken: data.tempToken };
  if (data.mfaSetupRequired && typeof data.tempToken === 'string') {
    return trySkipMfaSetup(data.tempToken);
  }
  if (data.mfaSetupSuggested && typeof data.tempToken === 'string') {
    return trySkipMfaSetup(data.tempToken);
  }
  throw new Error('Respuesta de login inesperada');
}

function computeHeroHeight(screenH: number, fraction: number, insetsTop: number) {
  return Math.max(240, Math.min(screenH * fraction, 340)) + BLEND_ZONE + insetsTop;
}

/* ─── Sub-components ──────────────────── */

function HeroPanel({
  image, title, subtitle, colors, fraction,
}: {
  image: string; title: string; subtitle: string; colors: ThemeColors; fraction: number;
}) {
  const { height: screenH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const heroH = computeHeroHeight(screenH, fraction, insets.top);

  return (
    <View style={{ height: heroH, width: '100%' }}>
      <ImageBackground source={{ uri: image }} style={{ flex: 1, backgroundColor: '#18181b' }} resizeMode="cover">
        <LinearGradient
          colors={[`${colors.primary}30`, 'transparent']}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['rgba(24,24,27,0.05)', 'rgba(9,9,11,0.72)', 'rgba(9,9,11,0.95)']}
          locations={[0.1, 0.5, 0.85]}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['transparent', colors.background]}
          locations={[0, 0.5]}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: BLEND_ZONE + 24 }}
        />

        <View style={{ flex: 1, justifyContent: 'flex-end', paddingHorizontal: spacing.xl, paddingBottom: BLEND_ZONE + spacing.md, paddingTop: insets.top + spacing.lg }}>
          <Animated.View entering={FadeIn.delay(80).duration(450)} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg }}>
            <View style={{ width: 38, height: 38, borderRadius: radius.md, backgroundColor: `${colors.primary}E6`, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="key" size={20} color="#fafafa" />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <Text variant="h3" style={{ color: '#fafafa', letterSpacing: -0.3 }}>Gym</Text>
              <Text variant="h3" style={{ color: colors.primary, letterSpacing: -0.3 }}>Key</Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(450)}>
            <Text variant="h1" style={{ color: '#fafafa', lineHeight: fontSize['3xl'] * 1.18, letterSpacing: -0.6, marginBottom: spacing.xs }}>
              {title}
            </Text>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(340).duration(400)}>
            <Text variant="body" style={{ color: 'rgba(244,244,245,0.78)', lineHeight: 22 }}>{subtitle}</Text>
          </Animated.View>
        </View>
      </ImageBackground>
    </View>
  );
}

function CardSheet({
  colors, isDark, minHeight, children,
}: {
  colors: ThemeColors; isDark: boolean; minHeight: number; children: React.ReactNode;
}) {
  return (
    <Animated.View
      entering={FadeInUp.delay(420).duration(500).springify().damping(20)}
      style={{
        backgroundColor: colors.background,
        borderTopLeftRadius: CARD_RADIUS,
        borderTopRightRadius: CARD_RADIUS,
        marginTop: -CARD_OVERLAP,
        paddingHorizontal: spacing.xl,
        paddingTop: spacing['2xl'],
        paddingBottom: spacing['5xl'],
        minHeight,
        shadowColor: isDark ? '#000' : colors.shadowColor,
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: isDark ? 0.5 : 0.08,
        shadowRadius: 20,
        elevation: 12,
      }}
    >
      {children}
    </Animated.View>
  );
}

function FloatingThemeToggle({ toggleMode, isDark }: { toggleMode: () => void; isDark: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      onPress={toggleMode}
      accessibilityLabel="Cambiar tema"
      accessibilityRole="button"
      style={{
        position: 'absolute', top: insets.top + spacing.sm, right: spacing.xl, zIndex: 30,
        width: 40, height: 40, borderRadius: 20,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
        backgroundColor: 'rgba(24,24,27,0.5)',
        justifyContent: 'center', alignItems: 'center',
      }}
    >
      <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={18} color="#fafafa" />
    </Pressable>
  );
}

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  const { colors } = useTheme();
  useEffect(() => { const t = setTimeout(onDismiss, 5000); return () => clearTimeout(t); }, [onDismiss]);

  return (
    <Animated.View
      entering={FadeInDown.duration(250)}
      exiting={FadeOut.duration(200)}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
        backgroundColor: colors.destructiveSurface, borderWidth: 1,
        borderColor: colors.destructive + '44', borderRadius: radius.md,
        paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
      }}
    >
      <Ionicons name="alert-circle" size={20} color={colors.destructive} />
      <Text variant="caption" color={colors.destructive} style={{ flex: 1 }}>{message}</Text>
      <Pressable onPress={onDismiss} hitSlop={8}>
        <Ionicons name="close" size={16} color={colors.destructive} />
      </Pressable>
    </Animated.View>
  );
}

function WelcomeFeatureRow({ icon, label, colors }: { icon: keyof typeof Ionicons.glyphMap; label: string; colors: ThemeColors }) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: spacing.md,
      backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border,
      borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    }}>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySurface, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <Text variant="body" weight="medium">{label}</Text>
    </View>
  );
}

/* ─── Screen shell (no theme toggle — lives outside) */

function ScreenShell({
  view, colors, isDark, children,
}: {
  view: ActiveView; colors: ThemeColors; isDark: boolean; children: React.ReactNode;
}) {
  const { height: screenH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const hero = HERO_CONTENT[view];
  const heroH = computeHeroHeight(screenH, hero.fraction, insets.top);
  const cardMinH = screenH - heroH + CARD_OVERLAP + insets.bottom;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <HeroPanel image={HERO_IMAGES[view]} title={hero.title} subtitle={hero.subtitle} colors={colors} fraction={hero.fraction} />
        <CardSheet colors={colors} isDark={isDark} minHeight={cardMinH}>
          {children}
        </CardSheet>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ─── Main ─────────────────────────────── */

export function LoginFlow({ onLogin }: { onLogin: (t: string) => Promise<void> }) {
  const OTP_LENGTH = 6;
  const { colors, toggleMode, isDark } = useTheme();

  const [screen, setScreen] = useState<AuthScreen>('welcome');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [mfaCountdown, setMfaCountdown] = useState(300);

  const [pwdTemp, setPwdTemp] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [newPassword2, setNewPassword2] = useState('');

  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (mfaToken) {
      setMfaCountdown(300);
      countdownRef.current = setInterval(() => {
        setMfaCountdown((v) => {
          if (v <= 1) { if (countdownRef.current) clearInterval(countdownRef.current); return 0; }
          return v - 1;
        });
      }, 1000);
    }
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [mfaToken]);

  const resetAuthFlows = useCallback(() => {
    setMfaToken(null); setPwdTemp(null); setOtp('');
    setNewPassword(''); setNewPassword2(''); setError('');
  }, []);

  const handleCredentials = async () => {
    if (!email.includes('@')) { setError('Ingresa un correo válido'); return; }
    if (!password) { setError('Ingresa tu contraseña'); return; }
    setLoading(true); setError('');
    try {
      const { data } = await authClient.post('/auth/login', { email, password });
      const next = await consumeLoginPayload(data, onLogin);
      if (next === 'done') return;
      if (next.step === 'mfa') setMfaToken(next.tempToken);
      else if (next.step === 'password') setPwdTemp(next.tempToken);
    } catch (e) {
      setError(formatAuthError(e));
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally { setLoading(false); }
  };

  const handleMfaVerify = async () => {
    if (!mfaToken) return;
    const token = otp.replace(/\D/g, '');
    if (token.length !== OTP_LENGTH) { setError('Ingresa los 6 dígitos'); return; }
    setLoading(true); setError('');
    try {
      const { data } = await authClient.post('/auth/mfa/verify-login', { token }, { headers: { Authorization: `Bearer ${mfaToken}` } });
      if (typeof data.access_token === 'string') { await onLogin(data.access_token); resetAuthFlows(); }
      else setError('No se recibió token');
    } catch { setError('Código incorrecto'); }
    finally { setLoading(false); }
  };

  const handlePasswordChange = async () => {
    if (newPassword.length < 8) { setError('Mínimo 8 caracteres'); return; }
    if (newPassword !== newPassword2) { setError('Las contraseñas no coinciden'); return; }
    if (!pwdTemp) return;
    setLoading(true); setError('');
    try {
      const { data } = await authClient.post('/auth/change-password', { password: newPassword }, { headers: { Authorization: `Bearer ${pwdTemp}` } });
      const next = await consumeLoginPayload(data, onLogin);
      if (next === 'done') { resetAuthFlows(); return; }
      if (next.step === 'mfa') { setPwdTemp(null); setMfaToken(next.tempToken); }
    } catch (e) {
      setError(formatAuthError(e));
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally { setLoading(false); }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail.includes('@')) { setError('Ingresa un correo válido'); return; }
    setLoading(true); setError('');
    try { await authClient.post('/auth/forgot-password', { email: forgotEmail }); setForgotSent(true); }
    catch { setError('No se pudo enviar el correo de recuperación'); }
    finally { setLoading(false); }
  };

  const fmtCountdown = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  const activeView: ActiveView = mfaToken ? 'mfa' : pwdTemp ? 'password' : screen;

  /* ─── Render ─────────────────────────── */

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── Welcome ── */}
      {activeView === 'welcome' && (
        <Animated.View entering={FadeIn.duration(420)} exiting={FadeOut.duration(280)} style={StyleSheet.absoluteFill}>
          <ScreenShell view="welcome" colors={colors} isDark={isDark}>
            <View style={{ gap: spacing.lg }}>
              <Animated.View entering={FadeInUp.delay(520).duration(380)}>
                <WelcomeFeatureRow icon="radio-outline" label="Ingreso por NFC y código QR" colors={colors} />
              </Animated.View>
              <Animated.View entering={FadeInUp.delay(620).duration(380)}>
                <WelcomeFeatureRow icon="barbell-outline" label="Rutinas personalizadas de tu coach" colors={colors} />
              </Animated.View>
              <Animated.View entering={FadeInUp.delay(720).duration(380)}>
                <WelcomeFeatureRow icon="card-outline" label="Historial de pagos y planes" colors={colors} />
              </Animated.View>
              <Animated.View entering={FadeInUp.delay(840).duration(380)} style={{ marginTop: spacing.md }}>
                <Button variant="primary" size="lg" fullWidth icon="arrow-forward-outline" haptic onPress={() => setScreen('login')}>
                  Comenzar
                </Button>
              </Animated.View>
            </View>
          </ScreenShell>
        </Animated.View>
      )}

      {/* ── Login ── */}
      {activeView === 'login' && (
        <Animated.View entering={FadeIn.duration(420)} exiting={FadeOut.duration(280)} style={StyleSheet.absoluteFill}>
          <ScreenShell view="login" colors={colors} isDark={isDark}>
            <View style={{ gap: spacing.lg }}>
              <Animated.View entering={FadeInDown.delay(480).duration(380)}>
                <Text variant="h2" style={{ marginBottom: spacing.xs }}>Inicia sesión</Text>
                <Text variant="body" color={colors.textSecondary} style={{ lineHeight: 22 }}>Usa el correo que te dio tu gimnasio.</Text>
              </Animated.View>

              <Animated.View entering={FadeInUp.delay(580).duration(380)} style={{ gap: spacing.md }}>
                <Input icon="mail-outline" placeholder="tu@correo.com" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
                <Input icon="lock-closed-outline" placeholder="Contraseña" value={password} onChangeText={setPassword} secureToggle secureTextEntry />
                <Pressable onPress={() => { setScreen('forgot'); setForgotEmail(email); setError(''); }} style={{ alignSelf: 'flex-end', paddingVertical: spacing.xs }} accessibilityRole="button">
                  <Text variant="caption" color={colors.primary} weight="semibold">Olvidé mi contraseña</Text>
                </Pressable>
              </Animated.View>

              {error ? <ErrorBanner message={error} onDismiss={() => setError('')} /> : null}

              <Animated.View entering={FadeInUp.delay(700).duration(380)}>
                <Button variant="primary" size="lg" fullWidth icon="log-in-outline" loading={loading} haptic onPress={handleCredentials}>
                  Iniciar sesión
                </Button>
              </Animated.View>

              <Animated.View entering={FadeIn.delay(820).duration(350)}>
                <Text variant="caption" color={colors.textTertiary} align="center" style={{ lineHeight: 20 }}>
                  ¿No tienes cuenta? Pide acceso en la recepción de tu gimnasio.
                </Text>
              </Animated.View>
            </View>
          </ScreenShell>
        </Animated.View>
      )}

      {/* ── Forgot ── */}
      {activeView === 'forgot' && (
        <Animated.View entering={FadeIn.duration(420)} exiting={FadeOut.duration(280)} style={StyleSheet.absoluteFill}>
          <ScreenShell view="forgot" colors={colors} isDark={isDark}>
            <View style={{ gap: spacing.lg }}>
              <Animated.View entering={FadeInDown.delay(480).duration(380)}>
                <Text variant="h2" style={{ marginBottom: spacing.xs }}>¿Olvidaste tu contraseña?</Text>
                <Text variant="body" color={colors.textSecondary} style={{ lineHeight: 22 }}>
                  Si tu cuenta tiene correo registrado, te enviaremos instrucciones para restablecerla. Si no, pide ayuda en recepción o con un asesor.
                </Text>
              </Animated.View>

              {!forgotSent ? (
                <>
                  <Animated.View entering={FadeInUp.delay(580).duration(380)}>
                    <Input icon="mail-outline" placeholder="tu@correo.com" value={forgotEmail} onChangeText={setForgotEmail} autoCapitalize="none" keyboardType="email-address" />
                  </Animated.View>
                  {error ? <ErrorBanner message={error} onDismiss={() => setError('')} /> : null}
                  <Animated.View entering={FadeInUp.delay(700).duration(380)} style={{ gap: spacing.md }}>
                    <Button variant="primary" size="lg" fullWidth icon="send-outline" loading={loading} haptic onPress={handleForgotPassword}>
                      Enviar instrucciones
                    </Button>
                    <Button variant="ghost" onPress={() => { setScreen('login'); setForgotSent(false); setError(''); }}>
                      Volver al inicio de sesión
                    </Button>
                  </Animated.View>
                </>
              ) : (
                <Animated.View entering={FadeIn.duration(360)} style={{ gap: spacing.lg }}>
                  <View style={{ backgroundColor: colors.successSurface, borderWidth: 1, borderColor: colors.success + '44', borderRadius: radius.lg, padding: spacing.lg }}>
                    <Text variant="body" style={{ color: colors.success, fontWeight: '600', lineHeight: 22 }}>
                      Si el correo existe en nuestro sistema, recibirás instrucciones en tu bandeja.
                    </Text>
                  </View>
                  <Button variant="secondary" size="lg" fullWidth onPress={() => { setScreen('login'); setForgotSent(false); setError(''); }}>
                    Volver al inicio de sesión
                  </Button>
                </Animated.View>
              )}
            </View>
          </ScreenShell>
        </Animated.View>
      )}

      {/* ── MFA ── */}
      {activeView === 'mfa' && (
        <Animated.View entering={FadeIn.duration(420)} exiting={FadeOut.duration(280)} style={StyleSheet.absoluteFill}>
          <ScreenShell view="mfa" colors={colors} isDark={isDark}>
            <View style={{ gap: spacing.xl }}>
              <Animated.View entering={FadeInDown.delay(480).duration(380)}>
                <Text variant="h2" style={{ marginBottom: spacing.xs }}>Código de verificación</Text>
                <Text variant="body" color={colors.textSecondary} style={{ lineHeight: 22 }}>Ingresa el código de tu app autenticadora.</Text>
              </Animated.View>

              <Animated.View entering={FadeInUp.delay(600).duration(400)}>
                <OtpInput length={OTP_LENGTH} value={otp} onChange={setOtp} />
              </Animated.View>

              <Animated.View entering={FadeIn.delay(720).duration(300)}>
                <Text variant="caption" color={mfaCountdown < 60 ? colors.destructive : colors.textTertiary} align="center">
                  Código válido por {fmtCountdown(mfaCountdown)}
                </Text>
              </Animated.View>

              {error ? <ErrorBanner message={error} onDismiss={() => setError('')} /> : null}

              <Animated.View entering={FadeInUp.delay(820).duration(380)} style={{ gap: spacing.md }}>
                <Button variant="primary" size="lg" fullWidth icon="arrow-forward" loading={loading} haptic onPress={handleMfaVerify}>
                  Continuar
                </Button>
                <Button variant="ghost" onPress={resetAuthFlows}>Volver al login</Button>
              </Animated.View>
            </View>
          </ScreenShell>
        </Animated.View>
      )}

      {/* ── Password change ── */}
      {activeView === 'password' && (
        <Animated.View entering={FadeIn.duration(420)} exiting={FadeOut.duration(280)} style={StyleSheet.absoluteFill}>
          <ScreenShell view="password" colors={colors} isDark={isDark}>
            <View style={{ gap: spacing.lg }}>
              <Animated.View entering={FadeInDown.delay(480).duration(380)}>
                <Text variant="h2" style={{ marginBottom: spacing.xs }}>Actualiza tu contraseña</Text>
                <Text variant="body" color={colors.textSecondary} style={{ lineHeight: 22 }}>Elige una contraseña segura de al menos 8 caracteres.</Text>
              </Animated.View>

              <Animated.View entering={FadeInUp.delay(580).duration(380)} style={{ gap: spacing.md }}>
                <Input icon="lock-closed-outline" placeholder="Nueva contraseña" value={newPassword} onChangeText={setNewPassword} secureToggle secureTextEntry />
                <Input icon="checkmark-circle-outline" placeholder="Repetir contraseña" value={newPassword2} onChangeText={setNewPassword2} secureTextEntry />
              </Animated.View>

              <Animated.View entering={FadeIn.delay(700).duration(300)}>
                <PasswordStrength password={newPassword} />
              </Animated.View>

              {error ? <ErrorBanner message={error} onDismiss={() => setError('')} /> : null}

              <Animated.View entering={FadeInUp.delay(800).duration(380)}>
                <Button variant="primary" size="lg" fullWidth icon="save-outline" loading={loading} haptic onPress={handlePasswordChange}>
                  Guardar
                </Button>
              </Animated.View>
            </View>
          </ScreenShell>
        </Animated.View>
      )}

      {/* Toggle persiste sobre todas las pantallas */}
      <FloatingThemeToggle toggleMode={toggleMode} isDark={isDark} />
    </View>
  );
}
