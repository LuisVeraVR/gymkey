import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { io, type Socket } from 'socket.io-client';
import {
  fetchMemberProfile,
  fetchMySubscription,
  fetchUnreadNotificationCount,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationDto,
} from '../memberApi';
import { getSocketOrigin } from '../api';
import { getStoredAccessToken } from '../tokenStorage';
import { useAuth } from '../context/AuthContext';
import { useGym } from '../context/GymContext';
import { useTheme } from '../context/ThemeContext';
import { spacing, radius, fontSize } from '../theme';
import { Text } from './ui/Text';
import { Badge } from './ui/Badge';
import { BottomSheet } from './ui/BottomSheet';
import { EmptyState } from './ui/EmptyState';

import { AccessTab } from './tabs/AccessTab';
import { TrainingTab } from './tabs/TrainingTab';
import { PlansTab } from './tabs/PlansTab';
import { PaymentsTab } from './tabs/PaymentsTab';
import { ProfileTab } from './tabs/ProfileTab';

type TabId = 'access' | 'training' | 'plans' | 'payments' | 'profile';

type MeUser = { name?: string; email?: string; role?: string } | null;
type Subscription = { status: string; planId?: string; endDate?: string; startDate?: string } | null;

const TAB_CONFIG: { id: TabId; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'access', label: 'Acceso', icon: 'key-outline' },
  { id: 'training', label: 'Entreno', icon: 'barbell-outline' },
  { id: 'plans', label: 'Planes', icon: 'diamond-outline' },
  { id: 'payments', label: 'Pagos', icon: 'card-outline' },
  { id: 'profile', label: 'Perfil', icon: 'person-outline' },
];

function formatNotifTime(iso: string) {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) return 'Ahora';
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return 'Hace un momento';
  const min = Math.floor(sec / 60);
  if (min < 60) return `Hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Hace ${h} h`;
  return d.toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' });
}

/* ─── TopBar ────────────────────────────── */

function TopBar({
  user,
  notifUnread,
  onNotifPress,
}: {
  user: MeUser;
  notifUnread: number;
  onNotifPress: () => void;
}) {
  const { colors, toggleMode, isDark } = useTheme();
  const initial = user?.name?.charAt(0) || user?.email?.charAt(0) || 'U';

  return (
    <View
      style={{
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.background,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.primarySurface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text variant="label" color={colors.primary} weight="bold">
            {initial}
          </Text>
        </View>
        <View>
          <Text variant="body" weight="bold" numberOfLines={1}>
            {user?.name || 'GymKey'}
          </Text>
          <Text variant="overline" color={colors.textTertiary} numberOfLines={1}>
            Tu gimnasio
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Pressable
          onPress={onNotifPress}
          style={{ padding: spacing.sm, position: 'relative' }}
          accessibilityLabel="Notificaciones"
          accessibilityRole="button"
        >
          <Ionicons name="notifications-outline" size={22} color={colors.text} />
          {notifUnread > 0 ? (
            <View
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                minWidth: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: colors.destructive,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 4,
              }}
            >
              <Text
                variant="overline"
                color={colors.textInverse}
                weight="bold"
                style={{ fontSize: 9 }}
              >
                {notifUnread > 99 ? '99+' : notifUnread}
              </Text>
            </View>
          ) : null}
        </Pressable>
        <Pressable
          onPress={toggleMode}
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfaceElevated,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          accessibilityLabel="Cambiar tema"
          accessibilityRole="button"
        >
          <Ionicons
            name={isDark ? 'sunny-outline' : 'moon-outline'}
            size={16}
            color={colors.text}
          />
        </Pressable>
      </View>
    </View>
  );
}

/* ─── FloatingTabBar ───────────────────── */

function FloatingTabBar({
  activeTab,
  onTabChange,
}: {
  activeTab: TabId;
  onTabChange: (id: TabId) => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const tabBarStyle = useMemo(
    () => ({
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-around' as const,
      marginHorizontal: spacing.lg,
      marginBottom: Math.max(insets.bottom, spacing.md),
      paddingVertical: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.separator,
    }),
    [colors, insets.bottom],
  );

  return (
    <View style={tabBarStyle}>
      {TAB_CONFIG.map((t) => {
        const active = activeTab === t.id;
        return (
          <Pressable
            key={t.id}
            onPress={() => {
              if (t.id !== activeTab) {
                onTabChange(t.id);
                if (Platform.OS !== 'web') Haptics.selectionAsync();
              }
            }}
            style={{ alignItems: 'center', paddingVertical: spacing.xs, flex: 1 }}
            accessibilityLabel={t.label}
            accessibilityRole="tab"
          >
            <Ionicons
              name={t.icon}
              size={22}
              color={active ? colors.tabActive : colors.tabInactive}
            />
            {active ? (
              <View
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: colors.primary,
                  marginTop: 3,
                }}
              />
            ) : null}
            <Text
              variant="overline"
              color={active ? colors.tabActive : colors.tabInactive}
              weight={active ? 'bold' : 'medium'}
              style={{ marginTop: 1, fontSize: 10 }}
            >
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ─── NotificationsSheet ───────────────── */

function NotificationsSheet({
  visible,
  onClose,
  items,
  loading,
  unread,
  onMarkRead,
  onMarkAllRead,
}: {
  visible: boolean;
  onClose: () => void;
  items: NotificationDto[];
  loading: boolean;
  unread: number;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}) {
  const { colors } = useTheme();

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Notificaciones" snapPoints={[0.65]}>
      {unread > 0 ? (
        <Pressable onPress={onMarkAllRead} style={{ alignSelf: 'flex-end', marginBottom: spacing.sm }}>
          <Text variant="caption" color={colors.primary} weight="semibold">
            Marcar todas como leídas
          </Text>
        </Pressable>
      ) : null}
      {loading ? (
        <Text variant="body" color={colors.textTertiary} align="center" style={{ marginTop: spacing.xl }}>
          Cargando...
        </Text>
      ) : items.length === 0 ? (
        <Text variant="body" color={colors.textTertiary} align="center" style={{ marginTop: spacing.xl }}>
          No hay notificaciones.
        </Text>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xl }}>
          {items.map((n) => (
            <Pressable
              key={n.id}
              onPress={() => { if (!n.read) onMarkRead(n.id); }}
              style={{
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.sm,
                borderBottomWidth: 1,
                borderBottomColor: colors.separator,
                backgroundColor: n.read ? 'transparent' : colors.primarySurface,
                borderRadius: n.read ? 0 : radius.sm,
                marginBottom: n.read ? 0 : spacing.xs,
              }}
            >
              <Text variant="body" weight="bold">{n.title}</Text>
              <Text variant="caption" color={colors.textSecondary} style={{ marginTop: 2 }}>
                {n.message}
              </Text>
              <Text variant="overline" color={colors.textTertiary} style={{ marginTop: spacing.xs }}>
                {formatNotifTime(n.createdAt)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </BottomSheet>
  );
}

/* ─── MainApp ──────────────────────────── */

export function MainApp() {
  const { signOut } = useAuth();
  const { platform, hasFeature, isBillingBlocked, gymDisplayName } = useGym();
  const { colors } = useTheme();
  const [tab, setTab] = useState<TabId>('access');
  const [user, setUser] = useState<MeUser>(null);
  const [subscription, setSubscription] = useState<Subscription>(null);

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifItems, setNotifItems] = useState<NotificationDto[]>([]);
  const [notifUnread, setNotifUnread] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [me, sub, unreadRes] = await Promise.all([
        fetchMemberProfile(),
        fetchMySubscription(),
        fetchUnreadNotificationCount().catch(() => 0),
      ]);
      setUser(me);
      setSubscription(sub);
      setNotifUnread(typeof unreadRes === 'number' ? unreadRes : 0);
    } catch { /* 401 → interceptor */ }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const loadNotifList = useCallback(async () => {
    setNotifLoading(true);
    try {
      const [items, countRes] = await Promise.all([
        fetchNotifications(40),
        fetchUnreadNotificationCount(),
      ]);
      setNotifItems(items);
      setNotifUnread(countRes);
    } catch {
      setNotifItems([]);
    } finally {
      setNotifLoading(false);
    }
  }, []);

  useEffect(() => {
    let socket: Socket | null = null;
    let cancelled = false;
    (async () => {
      const token = await getStoredAccessToken();
      if (!token || cancelled) return;
      socket = io(getSocketOrigin(), {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
      });
      socket.on('notification', (payload: NotificationDto) => {
        setNotifItems((prev) => {
          if (prev.some((p) => p.id === payload.id)) return prev;
          return [payload, ...prev].slice(0, 50);
        });
        if (!payload.read) setNotifUnread((c) => c + 1);
      });
    })();
    return () => { cancelled = true; socket?.disconnect(); };
  }, []);

  const onMarkRead = useCallback(async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifItems((prev) => prev.map((x) => (x.id === id ? { ...x, read: true } : x)));
      setNotifUnread((c) => Math.max(0, c - 1));
    } catch {}
  }, []);

  const onMarkAllRead = useCallback(async () => {
    try {
      await markAllNotificationsRead();
      setNotifItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setNotifUnread(0);
    } catch {}
  }, []);

  let body: React.ReactNode;
  switch (tab) {
    case 'access':
      body = (
        <AccessTab
          subscription={subscription}
          userRole={user?.role}
          billingBlocked={isBillingBlocked}
          nfcEnabled={hasFeature('nfcAccess')}
          onNavigatePlans={() => setTab('plans')}
        />
      );
      break;
    case 'training':
      body = <TrainingTab />;
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
          platformPlan={platform?.plan}
          platformStatus={platform?.status}
          gymName={gymDisplayName}
        />
      );
      break;
    default:
      body = null;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <TopBar
        user={user}
        notifUnread={notifUnread}
        onNotifPress={() => { setNotifOpen(true); loadNotifList(); }}
      />
      <View style={{ flex: 1 }}>
        {isBillingBlocked && tab !== 'profile' ? (
          <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
            <Badge
              variant="warning"
              label={`Suscripción de GymKey inactiva para ${gymDisplayName}.`}
            />
          </View>
        ) : null}
        <Animated.View key={tab} entering={FadeInUp.duration(250)} exiting={FadeOut.duration(120)} style={{ flex: 1 }}>
          {isBillingBlocked && tab !== 'profile' ? (
            <EmptyState
              icon="warning-outline"
              title="Suscripción del gimnasio inactiva"
              description={`El administrador de ${gymDisplayName} debe activar un plan de GymKey para seguir usando esta sección.`}
            />
          ) : body}
        </Animated.View>
      </View>
      <FloatingTabBar activeTab={tab} onTabChange={setTab} />

      <NotificationsSheet
        visible={notifOpen}
        onClose={() => setNotifOpen(false)}
        items={notifItems}
        loading={notifLoading}
        unread={notifUnread}
        onMarkRead={onMarkRead}
        onMarkAllRead={onMarkAllRead}
      />
    </SafeAreaView>
  );
}
