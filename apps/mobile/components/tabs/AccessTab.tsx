import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import QRCode from 'react-native-qrcode-svg';
import {
  fetchMyAccessKey,
  fetchRuntimeSettings,
  validateAccessKeyToken,
  type AccessValidationResult,
} from '../../memberApi';
import {
  getCachedAccessKey,
  saveCachedAccessKey,
} from '../../accessKeyCache';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { spacing, radius } from '../../theme';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import { ProgressRing } from '../ui/ProgressRing';
import { BottomSheet } from '../ui/BottomSheet';
import { EmptyState } from '../ui/EmptyState';

type Subscription = { status: string; planId?: string; endDate?: string } | null;

const REFRESH_INTERVAL = 25;

async function writeTokenToWritableNfcTag(token: string) {
  const NfcManager = (await import('react-native-nfc-manager')).default;
  const { NfcTech, Ndef } = await import('react-native-nfc-manager');
  const bytes = Ndef.encodeMessage([Ndef.textRecord(token)]);
  await NfcManager.start();
  await NfcManager.requestTechnology(NfcTech.Ndef);
  try {
    await NfcManager.ndefHandler.writeNdefMessage(bytes);
  } finally {
    await NfcManager.cancelTechnologyRequest();
  }
}

async function readTokenFromNfcTag() {
  const NfcManager = (await import('react-native-nfc-manager')).default;
  const { NfcTech, Ndef } = await import('react-native-nfc-manager');
  await NfcManager.start();
  await NfcManager.requestTechnology(NfcTech.Ndef);
  try {
    const message = await NfcManager.ndefHandler.getNdefMessage();
    const firstRecord = message?.ndefMessage?.[0];
    if (!firstRecord?.payload) throw new Error('Etiqueta NFC sin payload legible.');
    const payload = new Uint8Array(firstRecord.payload);
    if (payload.length < 2) throw new Error('Payload NFC inválido.');
    const langLength = payload[0] & 0x3f;
    const textBytes = payload.slice(1 + langLength);
    const token = Ndef.util.bytesToString(Array.from(textBytes));
    if (!token?.trim()) throw new Error('No se encontró token en la etiqueta NFC.');
    return token.trim();
  } finally {
    await NfcManager.cancelTechnologyRequest();
  }
}

function AccessTabInner({
  subscription,
  userRole,
  billingBlocked,
  nfcEnabled,
  onNavigatePlans,
}: {
  subscription: Subscription;
  userRole?: string;
  billingBlocked?: boolean;
  nfcEnabled?: boolean;
  onNavigatePlans: () => void;
}) {
  const isStaffMode = !!userRole && ['STAFF', 'COACH', 'GYM_ADMIN', 'SUPER_ADMIN'].includes(userRole);
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();

  const [accessKey, setAccessKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nfcBusy, setNfcBusy] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);
  const [timerProgress, setTimerProgress] = useState(1);
  const [staffResult, setStaffResult] = useState<AccessValidationResult | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseScale = useSharedValue(1);
  const qrScale = useSharedValue(1);
  const qrOpacity = useSharedValue(1);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withTiming(1.08, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [pulseScale]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const qrAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: qrScale.value }],
    opacity: qrOpacity.value,
  }));

  const startTimer = useCallback(() => {
    let elapsed = 0;
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerProgress(1);
    timerRef.current = setInterval(() => {
      elapsed += 0.5;
      setTimerProgress(Math.max(0, 1 - elapsed / REFRESH_INTERVAL));
    }, 500);
  }, []);

  const fetchKey = useCallback(async () => {
    try {
      const data = await fetchMyAccessKey();
      qrScale.value = withSpring(0.95, { damping: 15 });
      qrOpacity.value = withTiming(0.5, { duration: 100 }, () => {
        qrScale.value = withSpring(1, { damping: 12 });
        qrOpacity.value = withTiming(1, { duration: 200 });
      });
      setAccessKey(data.token);
      setOfflineMode(false);
      startTimer();
      await saveCachedAccessKey({
        token: data.token,
        fetchedAt: new Date().toISOString(),
        subscription: subscription?.status || null,
      });
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      const cached = await getCachedAccessKey();
      if (cached?.token) {
        setAccessKey(cached.token);
        setOfflineMode(true);
      }
    } finally {
      setLoading(false);
    }
  }, [subscription?.status, startTimer, qrScale, qrOpacity]);

  useEffect(() => {
    if (isStaffMode || subscription?.status === 'ACTIVE') {
      fetchKey();
      const iv = setInterval(fetchKey, REFRESH_INTERVAL * 1000);
      return () => { clearInterval(iv); if (timerRef.current) clearInterval(timerRef.current); };
    }
    setAccessKey('');
    setLoading(false);
    return undefined;
  }, [isStaffMode, subscription?.status, fetchKey]);

  const onPullRefresh = async () => {
    setRefreshing(true);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await fetchKey();
    setRefreshing(false);
  };

  const onShareToken = () => {
    if (!accessKey) return;
    Share.share({ message: accessKey, title: 'Llave GymKey' });
  };

  const onNfcWrite = async () => {
    if (!nfcEnabled) {
      showToast('info', 'El acceso NFC no está disponible en el plan actual de tu gimnasio.');
      return;
    }
    if (Platform.OS !== 'android') {
      showToast('info', 'La escritura NFC está disponible solo en Android.');
      return;
    }
    if (!accessKey) return;
    Alert.alert('Grabar NFC', 'Acerca el teléfono a una etiqueta NFC.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Continuar',
        onPress: async () => {
          setNfcBusy(true);
          try {
            await writeTokenToWritableNfcTag(accessKey);
            showToast('success', 'Token grabado en la etiqueta.');
          } catch (e) {
            showToast('error', e instanceof Error ? e.message : 'Error NFC');
          } finally {
            setNfcBusy(false);
          }
        },
      },
    ]);
  };

  const onNfcRead = async () => {
    if (!isStaffMode || Platform.OS !== 'android') return;
    setNfcBusy(true);
    try {
      const tokenFromTag = await readTokenFromNfcTag();
      const result = await validateAccessKeyToken(tokenFromTag);
      setStaffResult(result);
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'No se pudo leer NFC');
    } finally {
      setNfcBusy(false);
    }
  };

  if (billingBlocked) {
    return (
      <EmptyState
        icon="warning-outline"
        title="GymKey inactivo"
        description="Tu gimnasio necesita activar su suscripción de GymKey para usar el acceso digital."
      />
    );
  }

  if (!isStaffMode && (!subscription || subscription.status !== 'ACTIVE')) {
    return (
      <EmptyState
        icon="lock-closed"
        title="Sin acceso activo"
        description="Necesitas una membresía activa para generar tu llave. Revisa los planes disponibles."
        action={{ label: 'Ver planes', onPress: onNavigatePlans }}
      />
    );
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.lg }}>
        <Skeleton width={240} height={240} borderRadius={radius.xl} />
        <Skeleton width={200} height={16} />
        <Skeleton width={160} height={32} borderRadius={radius.full} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onPullRefresh} tintColor={colors.primary} />
      }
    >
      <Animated.View entering={FadeInUp.duration(400)}>
        <Text variant="h3" align="center" style={{ marginBottom: spacing.xl }}>
          {isStaffMode ? 'Acceso del Staff' : 'Tu llave de acceso'}
        </Text>
      </Animated.View>

      {/* QR container with breathing ring */}
      <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: 280,
              height: 280,
              borderRadius: radius['2xl'],
              borderWidth: 2,
              borderColor: colors.primary + '40',
            },
            pulseStyle,
          ]}
        />
        <Animated.View style={qrAnimStyle}>
          <Card variant="elevated" padding="xl" style={{ alignItems: 'center' }}>
            {accessKey ? (
              <QRCode value={accessKey} size={220} backgroundColor="transparent" color={colors.text} />
            ) : (
              <Text variant="body" color={colors.textTertiary}>Cargando...</Text>
            )}
          </Card>
        </Animated.View>
      </View>

      {/* Timer */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
        <ProgressRing progress={timerProgress} size={32} strokeWidth={3} />
        <Text variant="caption" color={colors.textSecondary}>
          Muestra este código en la entrada
        </Text>
      </View>

      {offlineMode ? (
        <Badge variant="warning" label="Modo offline - QR puede no estar vigente" style={{ marginBottom: spacing.md }} />
      ) : null}

      {/* Action buttons */}
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl }}>
        <Button variant="outline" size="sm" icon="share-outline" onPress={onShareToken}>
          Compartir
        </Button>
        {Platform.OS === 'android' ? (
          <Button variant="outline" size="sm" icon="radio-outline" onPress={onNfcWrite} disabled={nfcBusy}>
            {nfcBusy ? 'NFC...' : 'Escribir NFC'}
          </Button>
        ) : null}
        {isStaffMode && Platform.OS === 'android' ? (
          <Button variant="outline" size="sm" icon="scan-outline" onPress={onNfcRead} disabled={nfcBusy}>
            Leer NFC
          </Button>
        ) : null}
      </View>

      <Badge
        variant={isStaffMode ? 'primary' : 'success'}
        label={
          isStaffMode
            ? 'Modo validación staff'
            : subscription?.endDate
              ? `Membresía activa hasta ${new Date(subscription.endDate).toLocaleDateString('es')}`
              : 'Membresía activa'
        }
        size="md"
      />

      {/* Staff validation result */}
      <BottomSheet
        visible={!!staffResult}
        onClose={() => setStaffResult(null)}
        title={staffResult?.valid ? 'ACCESO CONCEDIDO' : 'ACCESO DENEGADO'}
      >
        <View style={{ gap: spacing.md, paddingVertical: spacing.lg }}>
          <View style={{ alignItems: 'center' }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: staffResult?.valid ? colors.successSurface : colors.destructiveSurface,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: spacing.md,
              }}
            >
              <Ionicons
                name={staffResult?.valid ? 'checkmark-circle' : 'close-circle'}
                size={36}
                color={staffResult?.valid ? colors.success : colors.destructive}
              />
            </View>
            <Text variant="h3" color={staffResult?.valid ? colors.success : colors.destructive}>
              {staffResult?.valid ? 'GRANTED' : 'DENIED'}
            </Text>
          </View>
          <Text variant="body" align="center" color={colors.textSecondary}>
            {staffResult?.user?.name || staffResult?.user?.email || 'Sin datos de usuario'}
          </Text>
          {!staffResult?.valid ? (
            <Text variant="caption" align="center" color={colors.destructive}>
              Motivo: {staffResult?.reason || 'Acceso denegado'}
            </Text>
          ) : null}
          <Button variant="primary" fullWidth onPress={() => setStaffResult(null)}>
            Cerrar
          </Button>
        </View>
      </BottomSheet>
    </ScrollView>
  );
}

export const AccessTab = memo(AccessTabInner);
