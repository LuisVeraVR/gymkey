import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_BASE_URL, authClient } from '../api';

type PostLogin =
  | 'done'
  | { step: 'mfa'; tempToken: string }
  | { step: 'password'; tempToken: string }
  | { step: 'mfaSetup'; tempToken: string };

type Mode = 'light' | 'dark';
type AuthScreen = 'welcome' | 'login' | 'forgot';

type Palette = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  muted: string;
  border: string;
  primary: string;
  primaryText: string;
  danger: string;
};

function getPalette(mode: Mode): Palette {
  if (mode === 'dark') {
    return {
      bg: '#030303',
      surface: '#111113',
      surfaceAlt: '#18181b',
      text: '#f5f5f5',
      muted: '#a1a1aa',
      border: '#27272a',
      primary: '#10b981',
      primaryText: '#ffffff',
      danger: '#f87171',
    };
  }

  return {
    bg: '#f8fafc',
    surface: '#ffffff',
    surfaceAlt: '#f1f5f9',
    text: '#0f172a',
    muted: '#64748b',
    border: '#e2e8f0',
    primary: '#10b981',
    primaryText: '#ffffff',
    danger: '#ef4444',
  };
}

function formatAuthError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (!err.response && (err.code === 'ERR_NETWORK' || err.message === 'Network Error')) {
      return `Sin conexión con el servidor (${API_BASE_URL}). ¿La API está en marcha y el puerto coincide con EXPO_PUBLIC_API_PORT / PORT?`;
    }
    const data = err.response?.data;
    if (data && typeof data === 'object' && 'message' in data) {
      const m = (data as { message: unknown }).message;
      if (typeof m === 'string') return m;
      if (Array.isArray(m)) return m.filter((x) => typeof x === 'string').join(', ');
    }
    if (err.response?.status === 401) {
      return 'Credenciales inválidas';
    }
    return err.message || 'Error al iniciar sesión';
  }
  if (err instanceof Error) return err.message;
  return 'Error al iniciar sesión';
}

async function consumeLoginPayload(
  data: Record<string, unknown>,
  signIn: (t: string) => Promise<void>,
): Promise<PostLogin> {
  if (typeof data.access_token === 'string') {
    await signIn(data.access_token);
    return 'done';
  }
  if (data.passwordChangeRequired && typeof data.tempToken === 'string') {
    return { step: 'password', tempToken: data.tempToken };
  }
  if (data.mfaRequired && typeof data.tempToken === 'string') {
    return { step: 'mfa', tempToken: data.tempToken };
  }
  if (data.mfaSetupRequired && typeof data.tempToken === 'string') {
    return { step: 'mfaSetup', tempToken: data.tempToken };
  }
  if (data.mfaSetupSuggested && typeof data.tempToken === 'string') {
    const r = await authClient.post(
      '/auth/mfa/skip',
      {},
      { headers: { Authorization: `Bearer ${data.tempToken}` } },
    );
    const at = r.data?.access_token;
    if (typeof at === 'string') {
      await signIn(at);
      return 'done';
    }
    throw new Error('Sin access_token tras omitir MFA');
  }
  throw new Error('Respuesta de login inesperada');
}

function InputRow({
  icon,
  iconColor,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  children: React.ReactNode;
}) {
  return (
    <View style={stylesStatic.inputRow}>
      <Ionicons name={icon} size={17} color={iconColor} />
      <View style={stylesStatic.inputFill}>{children}</View>
    </View>
  );
}

const stylesStatic = StyleSheet.create({
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inputFill: {
    flex: 1,
  },
});

function ScreenShell({
  mode,
  onToggleMode,
  title,
  subtitle,
  contentAnimatedStyle,
  children,
}: {
  mode: Mode;
  onToggleMode: () => void;
  title: string;
  subtitle: string;
  contentAnimatedStyle?: object;
  children: React.ReactNode;
}) {
  const palette = getPalette(mode);
  const styles = useMemo(() => makeStyles(palette), [palette]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.wrapper}>
        <View style={styles.headerRow}>
          <View style={styles.brandWrap}>
            <View style={styles.brandIconWrap}>
              <Ionicons name="barbell-outline" size={18} color={palette.primary} />
            </View>
            <View>
              <Text style={styles.brand}>GymKey</Text>
              <Text style={styles.brandSub}>Tu gimnasio en el móvil</Text>
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [styles.modeBtn, pressed && styles.pressScale]}
            onPress={onToggleMode}
          >
            <Ionicons
              name={mode === 'dark' ? 'sunny-outline' : 'moon-outline'}
              size={18}
              color={palette.text}
            />
          </Pressable>
        </View>

        <Animated.View style={[styles.card, contentAnimatedStyle]}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          <View style={styles.formBlock}>{children}</View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

export function LoginFlow({ onLogin }: { onLogin: (t: string) => Promise<void> }) {
  const [mode, setMode] = useState<Mode>('light');
  const [screen, setScreen] = useState<AuthScreen>('welcome');
  const palette = getPalette(mode);
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [otp, setOtp] = useState('');

  const [pwdTemp, setPwdTemp] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [newPassword2, setNewPassword2] = useState('');

  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const cardAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    cardAnim.setValue(0);
    Animated.timing(cardAnim, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [screen, mfaToken, pwdTemp, cardAnim]);

  const contentAnimatedStyle = {
    opacity: cardAnim,
    transform: [
      {
        translateY: cardAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [14, 0],
        }),
      },
    ],
  };

  const resetAuthFlows = () => {
    setMfaToken(null);
    setPwdTemp(null);
    setOtp('');
    setNewPassword('');
    setNewPassword2('');
  };

  const onToggleMode = () => setMode((m) => (m === 'light' ? 'dark' : 'light'));

  const handleCredentials = async () => {
    if (!email.includes('@')) {
      setError('Ingresa un correo válido');
      return;
    }
    if (!password) {
      setError('Ingresa tu contraseña');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { data } = await authClient.post('/auth/login', { email, password });
      const next = await consumeLoginPayload(data, onLogin);
      if (next === 'done') return;
      if (next.step === 'mfa') setMfaToken(next.tempToken);
      else if (next.step === 'password') setPwdTemp(next.tempToken);
      else if (next.step === 'mfaSetup') {
        Alert.alert(
          'Configurar MFA',
          'Tu cuenta requiere activar MFA. Hazlo desde la web o contacta al staff.',
        );
        resetAuthFlows();
      }
    } catch (e) {
      setError(formatAuthError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotEmail.includes('@')) {
      setError('Ingresa un correo válido');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await authClient.post('/auth/forgot-password', { email: forgotEmail });
      setForgotSent(true);
    } catch {
      setError('No se pudo enviar el correo de recuperación');
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerify = async () => {
    if (!mfaToken) return;

    setLoading(true);
    setError('');
    try {
      const { data } = await authClient.post(
        '/auth/mfa/verify-login',
        { token: otp },
        { headers: { Authorization: `Bearer ${mfaToken}` } },
      );
      if (typeof data.access_token === 'string') {
        await onLogin(data.access_token);
        resetAuthFlows();
      } else {
        setError('No se recibió token');
      }
    } catch {
      setError('Código incorrecto');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword.length < 8) {
      setError('Mínimo 8 caracteres');
      return;
    }
    if (newPassword !== newPassword2) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (!pwdTemp) return;

    setLoading(true);
    setError('');
    try {
      const { data } = await authClient.post(
        '/auth/change-password',
        { password: newPassword },
        { headers: { Authorization: `Bearer ${pwdTemp}` } },
      );
      const next = await consumeLoginPayload(data, onLogin);
      if (next === 'done') {
        resetAuthFlows();
        return;
      }
      if (next.step === 'mfa') {
        setPwdTemp(null);
        setMfaToken(next.tempToken);
      }
    } catch {
      setError('No se pudo actualizar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  if (mfaToken) {
    return (
      <ScreenShell
        mode={mode}
        onToggleMode={onToggleMode}
        title="Verificación en dos pasos"
        subtitle="Ingresa el código de tu app autenticadora"
        contentAnimatedStyle={contentAnimatedStyle}
      >
        <InputRow icon="shield-checkmark-outline" iconColor={palette.muted}>
          <TextInput
            style={styles.input}
            placeholder="Código de 6 dígitos"
            placeholderTextColor={palette.muted}
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={8}
          />
        </InputRow>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
          onPress={handleMfaVerify}
        >
          {loading ? (
            <ActivityIndicator color={palette.primaryText} />
          ) : (
            <View style={styles.btnInner}>
              <Ionicons name="arrow-forward" size={16} color={palette.primaryText} />
              <Text style={styles.primaryBtnText}>Continuar</Text>
            </View>
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.textBtn, pressed && styles.textBtnPressed]}
          onPress={() => {
            resetAuthFlows();
            setError('');
          }}
        >
          <Text style={styles.textBtnLabel}>Volver al login</Text>
        </Pressable>
      </ScreenShell>
    );
  }

  if (pwdTemp) {
    return (
      <ScreenShell
        mode={mode}
        onToggleMode={onToggleMode}
        title="Actualiza tu contraseña"
        subtitle="Por seguridad, debes crear una nueva"
        contentAnimatedStyle={contentAnimatedStyle}
      >
        <InputRow icon="lock-closed-outline" iconColor={palette.muted}>
          <TextInput
            style={styles.input}
            placeholder="Nueva contraseña"
            placeholderTextColor={palette.muted}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
          />
        </InputRow>

        <InputRow icon="checkmark-circle-outline" iconColor={palette.muted}>
          <TextInput
            style={styles.input}
            placeholder="Repetir contraseña"
            placeholderTextColor={palette.muted}
            value={newPassword2}
            onChangeText={setNewPassword2}
            secureTextEntry
          />
        </InputRow>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
          onPress={handlePasswordChange}
        >
          {loading ? (
            <ActivityIndicator color={palette.primaryText} />
          ) : (
            <View style={styles.btnInner}>
              <Ionicons name="save-outline" size={16} color={palette.primaryText} />
              <Text style={styles.primaryBtnText}>Guardar</Text>
            </View>
          )}
        </Pressable>
      </ScreenShell>
    );
  }

  if (screen === 'forgot') {
    return (
      <ScreenShell
        mode={mode}
        onToggleMode={onToggleMode}
        title="Recuperar contraseña"
        subtitle="Te enviaremos instrucciones por correo"
        contentAnimatedStyle={contentAnimatedStyle}
      >
        <View style={styles.forgotStack}>
          <View style={[styles.passwordRow, styles.inputRowNoTopMargin]}>
            <Ionicons name="mail-outline" size={17} color={palette.muted} />
            <TextInput
              style={styles.passwordInput}
              placeholder="Correo electrónico"
              placeholderTextColor={palette.muted}
              value={forgotEmail}
              onChangeText={setForgotEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          {forgotSent ? (
            <Text style={[styles.success, styles.forgotMessageSpacing]}>
              Si el correo existe, recibirás instrucciones.
            </Text>
          ) : null}
          {error ? (
            <Text style={[styles.error, styles.forgotMessageSpacing]}>{error}</Text>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              styles.forgotPrimaryBtn,
              pressed && styles.primaryBtnPressed,
            ]}
            onPress={handleForgotPassword}
          >
            {loading ? (
              <ActivityIndicator color={palette.primaryText} />
            ) : (
              <View style={styles.btnInner}>
                <Ionicons name="send-outline" size={16} color={palette.primaryText} />
                <Text style={styles.primaryBtnText}>Enviar instrucciones</Text>
              </View>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.textBtn,
              styles.forgotBackBtn,
              pressed && styles.textBtnPressed,
            ]}
            onPress={() => {
              setScreen('login');
              setForgotSent(false);
              setError('');
            }}
          >
            <Text style={styles.textBtnLabel}>Volver al login</Text>
          </Pressable>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      mode={mode}
      onToggleMode={onToggleMode}
      title={screen === 'welcome' ? 'Control total de tu gimnasio' : 'Bienvenido'}
      subtitle={
        screen === 'welcome'
          ? 'Acceso por NFC o QR, pagos y rutinas en una sola app.'
          : 'Inicia sesión para acceder a tu gimnasio'
      }
      contentAnimatedStyle={contentAnimatedStyle}
    >
      {screen === 'welcome' ? (
        <View style={styles.fullHeightBody}>
          <View>
            <View style={styles.welcomeVisual}>
              <View style={styles.welcomePhone}>
                <Ionicons name="phone-portrait-outline" size={32} color={palette.primary} />
              </View>
              <View style={styles.welcomePoints}>
                <View style={styles.pointRow}>
                  <Ionicons name="radio-outline" size={16} color={palette.primary} />
                  <Text style={styles.pointText}>Ingreso principal con NFC</Text>
                </View>
                <View style={styles.pointRow}>
                  <Ionicons name="qr-code-outline" size={16} color={palette.primary} />
                  <Text style={styles.pointText}>Respaldo inmediato con QR</Text>
                </View>
                <View style={styles.pointRow}>
                  <Ionicons name="wallet-outline" size={16} color={palette.primary} />
                  <Text style={styles.pointText}>Pagos y rutinas en tiempo real</Text>
                </View>
              </View>
            </View>

            <View style={styles.dots}>
              <View style={[styles.dot, styles.dotActive]} />
              <View style={styles.dot} />
              <View style={styles.dot} />
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
            onPress={() => setScreen('login')}
          >
            <View style={styles.btnInner}>
              <Ionicons name="arrow-forward-outline" size={16} color={palette.primaryText} />
              <Text style={styles.primaryBtnText}>Comenzar</Text>
            </View>
          </Pressable>
        </View>
      ) : (
        <View style={styles.fullHeightBody}>
          <View style={styles.loginFormStack}>
            <View style={[styles.passwordRow, styles.inputRowNoTopMargin]}>
              <Ionicons name="mail-outline" size={17} color={palette.muted} />
              <TextInput
                style={styles.passwordInput}
                placeholder="Correo electrónico"
                placeholderTextColor={palette.muted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.passwordRow}>
              <Ionicons name="lock-closed-outline" size={17} color={palette.muted} />
              <TextInput
                style={styles.passwordInput}
                placeholder="Contraseña"
                placeholderTextColor={palette.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <Pressable
                style={({ pressed }) => [styles.passwordToggle, pressed && styles.pressScale]}
                onPress={() => setShowPassword((v) => !v)}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={palette.muted}
                />
              </Pressable>
            </View>

            <View style={styles.inlineActions}>
              <Pressable
                style={({ pressed }) => [pressed && styles.textBtnPressed]}
                onPress={() => {
                  setScreen('forgot');
                  setForgotEmail(email);
                  setError('');
                }}
              >
                <Text style={styles.textBtnLabel}>Olvidé mi contraseña</Text>
              </Pressable>
            </View>

            {error ? (
              <Text style={[styles.error, styles.loginMessageSpacing]}>{error}</Text>
            ) : null}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.primaryBtn,
              styles.loginPrimaryBtn,
              pressed && styles.primaryBtnPressed,
            ]}
            onPress={handleCredentials}
          >
            {loading ? (
              <ActivityIndicator color={palette.primaryText} />
            ) : (
              <View style={styles.btnInner}>
                <Ionicons name="log-in-outline" size={16} color={palette.primaryText} />
                <Text style={styles.primaryBtnText}>Iniciar sesión</Text>
              </View>
            )}
          </Pressable>
        </View>
      )}
    </ScreenShell>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.bg,
    },
    wrapper: {
      flex: 1,
      width: '100%',
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 12,
      justifyContent: 'flex-start',
      gap: 14,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 2,
    },
    brandWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    brandIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    brand: {
      color: c.text,
      fontSize: 20,
      fontWeight: '800',
    },
    brandSub: {
      color: c.muted,
      fontSize: 13,
      marginTop: 2,
    },
    modeBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    card: {
      flex: 1,
      backgroundColor: 'transparent',
      borderWidth: 0,
      borderRadius: 0,
      paddingHorizontal: 0,
      paddingVertical: 0,
      gap: 10,
    },
    title: {
      color: c.text,
      fontSize: 26,
      fontWeight: '800',
    },
    subtitle: {
      color: c.muted,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 2,
    },
    formBlock: {
      flex: 1,
      marginTop: 8,
    },
    fullHeightBody: {
      flex: 1,
      justifyContent: 'space-between',
      gap: 14,
    },
    welcomeVisual: {
      backgroundColor: c.surfaceAlt,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
      gap: 12,
    },
    welcomePhone: {
      width: 52,
      height: 52,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surface,
    },
    welcomePoints: {
      gap: 8,
    },
    pointRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    pointText: {
      color: c.text,
      fontSize: 14,
      fontWeight: '500',
    },
    dots: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
      marginTop: 8,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: c.border,
    },
    dotActive: {
      width: 20,
      backgroundColor: c.primary,
    },
    input: {
      backgroundColor: c.surfaceAlt,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 13,
      fontSize: 15,
      color: c.text,
    },
    passwordRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      backgroundColor: c.surfaceAlt,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
      paddingLeft: 14,
      marginTop: 10,
    },
    inputRowNoTopMargin: {
      marginTop: 0,
    },
    loginFormStack: {
      width: '100%',
    },
    loginPrimaryBtn: {
      marginTop: 28,
    },
    loginMessageSpacing: {
      marginTop: 16,
    },
    forgotStack: {
      flex: 1,
      width: '100%',
    },
    forgotMessageSpacing: {
      marginTop: 16,
    },
    forgotPrimaryBtn: {
      marginTop: 28,
    },
    forgotBackBtn: {
      marginTop: 20,
      paddingVertical: 12,
    },
    passwordInput: {
      flex: 1,
      paddingHorizontal: 10,
      paddingVertical: 13,
      color: c.text,
      fontSize: 15,
    },
    passwordToggle: {
      borderLeftWidth: 1,
      borderLeftColor: c.border,
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    inlineActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 16,
      paddingVertical: 4,
    },
    primaryBtn: {
      backgroundColor: c.primary,
      borderRadius: 12,
      paddingVertical: 13,
      alignItems: 'center',
      marginTop: 2,
    },
    primaryBtnPressed: {
      opacity: 0.92,
      transform: [{ scale: 0.985 }],
    },
    pressScale: {
      transform: [{ scale: 0.97 }],
    },
    btnInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    primaryBtnText: {
      color: c.primaryText,
      fontSize: 15,
      fontWeight: '700',
    },
    textBtn: {
      alignItems: 'center',
      marginTop: 2,
      paddingVertical: 4,
    },
    textBtnPressed: {
      opacity: 0.7,
    },
    textBtnLabel: {
      color: c.primary,
      fontSize: 13,
      fontWeight: '600',
    },
    error: {
      color: c.danger,
      fontSize: 13,
      textAlign: 'center',
      fontWeight: '500',
      marginTop: 8,
    },
    success: {
      color: c.primary,
      fontSize: 13,
      textAlign: 'center',
      fontWeight: '600',
      marginTop: 8,
    },
  });
}
