import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import {
  fetchMemberProfile,
  fetchMyAccessKey,
  fetchMyPayments,
  fetchMyRoutines,
  fetchMySubscription,
  fetchPlans,
  subscribeToPlan,
} from '../memberApi';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme';

type TabId = 'access' | 'routines' | 'plans' | 'payments' | 'profile';

type Subscription = {
  status: string;
  planId?: string;
} | null;

type MeUser = {
  name?: string;
  email?: string;
  role?: string;
} | null;

type Plan = {
  id: string;
  name: string;
  price: unknown;
  description?: string | null;
  duration?: number;
  durationDays?: number;
};

type PaymentRow = {
  id: string;
  amount: unknown;
  currency: string;
  status: string;
  method: string;
  createdAt: string;
};

type RoutineRow = {
  id: string;
  name: string;
  content: unknown;
  createdAt?: string;
};

function formatMoney(amount: unknown, currency: string) {
  const n = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  if (Number.isNaN(n)) return `${amount} ${currency}`;
  try {
    return new Intl.NumberFormat('es', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(n);
  } catch {
    return `${n} ${currency}`;
  }
}

function paymentStatusLabel(s: string) {
  const map: Record<string, string> = {
    PENDING: 'Pendiente',
    COMPLETED: 'Completado',
    FAILED: 'Fallido',
    REFUNDED: 'Reembolsado',
  };
  return map[s] || s;
}

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

function AccessTab({ subscription }: { subscription: Subscription }) {
  const [accessKey, setAccessKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [nfcBusy, setNfcBusy] = useState(false);

  const fetchKey = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchMyAccessKey();
      setAccessKey(data.token);
    } catch {
      /* 401 manejado por interceptor */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (subscription?.status === 'ACTIVE') {
      fetchKey();
      const interval = setInterval(fetchKey, 25000);
      return () => clearInterval(interval);
    }
    setAccessKey('');
  }, [subscription?.status, fetchKey]);

  const onShareToken = () => {
    if (!accessKey) return;
    Share.share({ message: accessKey, title: 'Llave GymKey' });
  };

  const onNfcWrite = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert(
        'NFC',
        'La escritura en etiquetas NFC está pensada para Android. En iOS usa el código QR.',
      );
      return;
    }
    if (!accessKey) return;
    Alert.alert(
      'Grabar NFC',
      'Acerca el teléfono a una etiqueta NFC vacía o grabable. Se sobrescribirá el mensaje NDEF con tu token actual.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          onPress: async () => {
            setNfcBusy(true);
            try {
              await writeTokenToWritableNfcTag(accessKey);
              Alert.alert('Listo', 'Token grabado en la etiqueta.');
            } catch (e) {
              const msg =
                e instanceof Error ? e.message : 'Comprueba que NFC esté activo. En Expo Go hace falta un development build.';
              Alert.alert('NFC', msg);
            } finally {
              setNfcBusy(false);
            }
          },
        },
      ],
    );
  };

  if (!subscription || subscription.status !== 'ACTIVE') {
    return (
      <View style={styles.centered}>
        <Text style={styles.warnTitle}>Sin acceso activo</Text>
        <Text style={styles.mutedCenter}>
          Necesitas una suscripción activa para generar tu llave.
        </Text>
        <Text style={styles.hint}>Usa la pestaña Planes para suscribirte.</Text>
      </View>
    );
  }

  return (
    <View style={styles.centered}>
      <Text style={styles.screenTitle}>Tu llave de acceso</Text>
      <View style={styles.qrContainer}>
        {loading && !accessKey ? (
          <ActivityIndicator size="large" color={theme.primary} />
        ) : accessKey ? (
          <QRCode value={accessKey} size={240} />
        ) : (
          <Text>Cargando…</Text>
        )}
      </View>
      <Text style={styles.hint}>El código se renueva frecuentemente (~30s)</Text>
      <View style={styles.rowActions}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={onShareToken}>
          <Text style={styles.secondaryBtnText}>Compartir / copiar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryBtn, nfcBusy && styles.disabledBtn]}
          onPress={onNfcWrite}
          disabled={nfcBusy || !accessKey}
        >
          <Text style={styles.secondaryBtnText}>
            {nfcBusy ? 'NFC…' : 'Grabar en etiqueta NFC'}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.statusBadge}>
        <Text style={styles.statusText}>Membresía activa</Text>
      </View>
    </View>
  );
}

function RoutinesTab() {
  const [list, setList] = useState<RoutineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<RoutineRow | null>(null);

  useEffect(() => {
    fetchMyRoutines()
      .then((rows) => setList(rows))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (!list.length) {
    return (
      <View style={styles.centered}>
        <Text style={styles.mutedCenter}>
          Aún no tienes rutinas asignadas. Tu coach las publicará aquí.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.flex1}>
      <Text style={styles.headerTitle}>Mis rutinas</Text>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {list.map((r) => (
          <TouchableOpacity
            key={r.id}
            style={styles.card}
            onPress={() => setSelected(r)}
          >
            <Text style={styles.planName}>{r.name}</Text>
            <Text style={styles.planDesc}>Toca para ver detalle</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <Modal visible={!!selected} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{selected?.name}</Text>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.jsonBlock}>
                {selected
                  ? JSON.stringify(selected.content, null, 2)
                  : ''}
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={styles.button}
              onPress={() => setSelected(null)}
            >
              <Text style={styles.buttonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function PlansTab({
  subscription,
  onChanged,
}: {
  subscription: Subscription;
  onChanged: () => void;
}) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlans()
      .then((rows) => setPlans(rows))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSubscribe = async (planId: string) => {
    try {
      await subscribeToPlan(planId);
      Alert.alert('Listo', 'Suscripción actualizada.');
      onChanged();
    } catch (e: unknown) {
      const msg =
        e &&
        typeof e === 'object' &&
        'response' in e &&
        (e as { response?: { data?: { message?: unknown } } }).response?.data
          ?.message;
      const text =
        typeof msg === 'string'
          ? msg
          : Array.isArray(msg)
            ? msg.join(', ')
            : 'Solo miembros pueden suscribirse desde la app, o ya tienes un plan activo.';
      Alert.alert('No disponible', text);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={styles.flex1}>
      <Text style={styles.headerTitle}>Planes</Text>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {plans.map((plan) => {
          const days = plan.durationDays ?? plan.duration ?? 30;
          const priceLabel = formatMoney(plan.price, 'USD');
          return (
            <View key={plan.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planPrice}>{priceLabel}</Text>
              </View>
              <Text style={styles.planDesc}>
                {plan.description || 'Acceso al gimnasio'}
              </Text>
              <Text style={styles.planDuration}>{days} días de acceso</Text>
              <TouchableOpacity
                style={[
                  styles.subButton,
                  subscription?.planId === plan.id && styles.disabledButton,
                ]}
                disabled={subscription?.planId === plan.id}
                onPress={() => handleSubscribe(plan.id)}
              >
                <Text style={styles.buttonText}>
                  {subscription?.planId === plan.id
                    ? 'Plan actual'
                    : 'Suscribirse'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function PaymentsTab() {
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyPayments()
      .then((rows) => setRows(rows))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (!rows.length) {
    return (
      <View style={styles.centered}>
        <Text style={styles.mutedCenter}>No hay pagos registrados aún.</Text>
      </View>
    );
  }

  return (
    <View style={styles.flex1}>
      <Text style={styles.headerTitle}>Mis pagos</Text>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {rows.map((p) => (
          <View key={p.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.planName}>
                {formatMoney(p.amount, p.currency)}
              </Text>
              <Text
                style={[
                  styles.paymentStatus,
                  p.status === 'COMPLETED' && styles.paymentOk,
                  p.status === 'PENDING' && styles.paymentPending,
                  p.status === 'FAILED' && styles.paymentBad,
                ]}
              >
                {paymentStatusLabel(p.status)}
              </Text>
            </View>
            <Text style={styles.planDesc}>
              {p.method} · {new Date(p.createdAt).toLocaleString('es')}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function ProfileTab({
  user,
  subscription,
  onLogout,
}: {
  user: MeUser;
  subscription: Subscription;
  onLogout: () => void;
}) {
  const initial = user?.name?.charAt(0) || user?.email?.charAt(0) || 'U';
  return (
    <View style={styles.flex1}>
      <Text style={styles.headerTitle}>Perfil</Text>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <Text style={styles.userName}>{user?.name || 'Usuario'}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{user?.role}</Text>
        </View>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Suscripción</Text>
        {subscription ? (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Estado</Text>
            <Text
              style={[
                styles.value,
                subscription.status === 'ACTIVE'
                  ? { color: theme.success }
                  : { color: theme.destructive },
              ]}
            >
              {subscription.status}
            </Text>
          </View>
        ) : (
          <Text style={styles.placeholderText}>Sin suscripción</Text>
        )}
      </View>
      <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

export function MainApp() {
  const { signOut } = useAuth();
  const [tab, setTab] = useState<TabId>('access');
  const [user, setUser] = useState<MeUser>(null);
  const [subscription, setSubscription] = useState<Subscription>(null);

  const refresh = useCallback(async () => {
    try {
      const [me, sub] = await Promise.all([
        fetchMemberProfile(),
        fetchMySubscription(),
      ]);
      setUser(me);
      setSubscription(sub);
    } catch {
      /* 401 → interceptor */
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const tabs: {
    id: TabId;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
    { id: 'access', label: 'Acceso', icon: 'key-outline' },
    { id: 'routines', label: 'Rutinas', icon: 'barbell-outline' },
    { id: 'plans', label: 'Planes', icon: 'diamond-outline' },
    { id: 'payments', label: 'Pagos', icon: 'card-outline' },
    { id: 'profile', label: 'Perfil', icon: 'person-outline' },
  ];

  let body: React.ReactNode;
  switch (tab) {
    case 'access':
      body = <AccessTab subscription={subscription} />;
      break;
    case 'routines':
      body = <RoutinesTab />;
      break;
    case 'plans':
      body = <PlansTab subscription={subscription} onChanged={refresh} />;
      break;
    case 'payments':
      body = <PaymentsTab />;
      break;
    case 'profile':
      body = (
        <ProfileTab
          user={user}
          subscription={subscription}
          onLogout={signOut}
        />
      );
      break;
    default:
      body = null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.mainContent}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.brandName}>GymKey</Text>
            <Text style={styles.brandSub}>Aplicación del gimnasio</Text>
          </View>
          <View style={styles.rolePill}>
            <Text style={styles.rolePillText}>{user?.role || 'MEMBER'}</Text>
          </View>
        </View>
        <View style={styles.contentCard}>{body}</View>
      </View>
      <View style={styles.tabBar}>
        {tabs.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tabItem, tab === t.id && styles.activeTab]}
            onPress={() => setTab(t.id)}
          >
            <Ionicons
              name={t.icon}
              size={16}
              color={tab === t.id ? theme.primary : theme.muted}
              style={styles.tabIcon}
            />
            <Text
              style={[styles.tabText, tab === t.id && styles.activeTabText]}
              numberOfLines={1}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.surface,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 10,
  },
  topBar: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandName: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.foreground,
  },
  brandSub: {
    fontSize: 12,
    color: theme.muted,
    marginTop: 2,
  },
  rolePill: {
    backgroundColor: theme.primaryMuted,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  rolePillText: {
    color: theme.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  contentCard: {
    flex: 1,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  flex1: { flex: 1 },
  screenTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 24,
    color: theme.foreground,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
    color: theme.foreground,
  },
  qrContainer: {
    padding: 20,
    backgroundColor: theme.card,
    borderRadius: theme.radiusLg,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 12,
  },
  hint: {
    color: theme.muted,
    marginTop: 8,
    textAlign: 'center',
    fontSize: 13,
  },
  mutedCenter: {
    textAlign: 'center',
    color: theme.muted,
    lineHeight: 22,
  },
  rowActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    marginTop: 16,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: theme.primary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: theme.radius,
  },
  secondaryBtnText: {
    color: theme.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  disabledBtn: { opacity: 0.5 },
  statusBadge: {
    marginTop: 24,
    backgroundColor: theme.primaryMuted,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    color: theme.success,
    fontWeight: '700',
    fontSize: 12,
  },
  warnTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.destructive,
    marginBottom: 8,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.card,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingBottom: 8,
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: 2,
    borderTopColor: 'transparent',
    borderRadius: 10,
  },
  activeTab: {
    borderTopColor: theme.primary,
    backgroundColor: theme.surfaceStrong,
  },
  tabIcon: {
    marginBottom: 2,
  },
  tabText: {
    fontSize: 11,
    color: theme.muted,
    fontWeight: '500',
  },
  activeTabText: {
    color: theme.primary,
    fontWeight: '700',
  },
  scrollContent: { paddingBottom: 24 },
  card: {
    backgroundColor: theme.card,
    padding: 16,
    borderRadius: theme.radiusLg,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planName: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.foreground,
  },
  planPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.primary,
  },
  planDesc: { color: theme.muted, marginBottom: 4 },
  planDuration: {
    color: theme.mutedLight,
    fontSize: 12,
    marginBottom: 12,
  },
  subButton: {
    backgroundColor: theme.primary,
    padding: 12,
    borderRadius: theme.radius,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: theme.mutedLight,
  },
  button: {
    backgroundColor: theme.primary,
    padding: 14,
    borderRadius: theme.radius,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
  paymentStatus: { fontWeight: '700', fontSize: 13 },
  paymentOk: { color: theme.success },
  paymentPending: { color: theme.warning },
  paymentBad: { color: theme.destructive },
  profileCard: {
    alignItems: 'center',
    backgroundColor: theme.card,
    padding: 24,
    borderRadius: theme.radiusLg,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.border,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.primary,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.foreground,
  },
  userEmail: { color: theme.muted, marginBottom: 8 },
  roleBadge: {
    backgroundColor: theme.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleText: {
    fontSize: 12,
    color: theme.muted,
    fontWeight: '600',
  },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    color: theme.muted,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.card,
    padding: 14,
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.border,
  },
  label: { color: theme.muted },
  value: { fontWeight: '700' },
  placeholderText: {
    color: theme.mutedLight,
    fontStyle: 'italic',
  },
  logoutButton: {
    backgroundColor: theme.destructiveSurface,
    padding: 14,
    borderRadius: theme.radius,
    alignItems: 'center',
  },
  logoutText: {
    color: theme.destructive,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: theme.card,
    borderTopLeftRadius: theme.radiusLg,
    borderTopRightRadius: theme.radiusLg,
    padding: 20,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: theme.foreground,
  },
  modalScroll: { maxHeight: 400 },
  jsonBlock: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: 12,
    color: theme.foreground,
  },
});
