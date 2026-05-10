import { memo, useCallback, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchSubscriptionHistory } from '../../memberApi';
import { useTheme } from '../../context/ThemeContext';
import { spacing, radius } from '../../theme';
import { Text } from '../ui/Text';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { BottomSheet } from '../ui/BottomSheet';

type MeUser = { name?: string; email?: string; role?: string } | null;
type Subscription = { status: string; planId?: string; endDate?: string; startDate?: string } | null;
type SubscriptionHistoryRow = {
  id: string;
  status: string;
  isCurrent: boolean;
  startDate: string;
  endDate: string;
  plan: { name: string; price: unknown };
};

type ThemePreference = 'system' | 'light' | 'dark';

function ProfileTabInner({
  user,
  subscription,
  onLogout,
  platformPlan,
  platformStatus,
  gymName,
}: {
  user: MeUser;
  subscription: Subscription;
  onLogout: () => void;
  platformPlan?: string | null;
  platformStatus?: string | null;
  gymName?: string;
}) {
  const { colors, preference, setMode } = useTheme();
  const initial = user?.name?.charAt(0) || user?.email?.charAt(0) || 'U';

  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<SubscriptionHistoryRow[]>([]);
  const [histLoading, setHistLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    setHistoryOpen(true);
    setHistLoading(true);
    try {
      const data = await fetchSubscriptionHistory();
      setHistory(data);
    } catch {
      setHistory([]);
    } finally {
      setHistLoading(false);
    }
  }, []);

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro de que deseas cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: onLogout },
    ]);
  };

  const daysRemaining = subscription?.endDate
    ? Math.max(0, Math.ceil((new Date(subscription.endDate).getTime() - Date.now()) / 86400000))
    : 0;
  const totalDays = subscription?.startDate && subscription?.endDate
    ? Math.max(1, Math.ceil((new Date(subscription.endDate).getTime() - new Date(subscription.startDate).getTime()) / 86400000))
    : 30;
  const membershipProgress = totalDays > 0 ? daysRemaining / totalDays : 0;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['3xl'] }}>
        {/* Avatar + info */}
        <View style={{ alignItems: 'center', marginBottom: spacing['2xl'] }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: colors.primarySurface,
              borderWidth: 2,
              borderColor: colors.primary + '44',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.md,
            }}
          >
            <Text variant="h1" color={colors.primary}>{initial}</Text>
          </View>
          <Text variant="h2" align="center">{user?.name || 'Usuario'}</Text>
          <Text variant="body" color={colors.textSecondary} align="center" style={{ marginTop: spacing.xs }}>
            {user?.email}
          </Text>
          <Badge variant="neutral" label={user?.role || 'MEMBER'} style={{ marginTop: spacing.sm }} />
        </View>

        {/* Membership section */}
        <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
          <Text variant="label" color={colors.textTertiary} style={{ marginBottom: spacing.sm }}>
            GymKey del gimnasio
          </Text>
          <Text variant="body" weight="semibold">
            {gymName || 'Tu gimnasio'} usa GymKey {platformPlan || 'DEMO'}
          </Text>
          <Text variant="caption" color={colors.textSecondary} style={{ marginTop: spacing.xs }}>
            Estado de la plataforma: {platformStatus || 'ACTIVE'}
          </Text>
        </Card>

        <Card variant="elevated" style={{ marginBottom: spacing.lg }}>
          <Text variant="label" color={colors.textTertiary} style={{ marginBottom: spacing.sm }}>
            Membresía
          </Text>
          {subscription ? (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
                <Text variant="body" weight="semibold">Estado</Text>
                <Badge
                  variant={subscription.status === 'ACTIVE' ? 'success' : 'destructive'}
                  label={subscription.status === 'ACTIVE' ? 'Activa' : subscription.status}
                />
              </View>
              {subscription.endDate ? (
                <>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
                    <Text variant="caption" color={colors.textSecondary}>Vence</Text>
                    <Text variant="caption" weight="semibold">
                      {new Date(subscription.endDate).toLocaleDateString('es')}
                    </Text>
                  </View>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.border, marginBottom: spacing.xs }}>
                    <View
                      style={{
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: membershipProgress > 0.2 ? colors.primary : colors.warning,
                        width: `${Math.min(100, membershipProgress * 100)}%`,
                      }}
                    />
                  </View>
                  <Text variant="overline" color={colors.textTertiary}>
                    {daysRemaining} días restantes
                  </Text>
                </>
              ) : null}
            </>
          ) : (
            <Text variant="body" color={colors.textTertiary}>Sin suscripción activa</Text>
          )}
        </Card>

        {/* History link */}
        <Card variant="default" onPress={loadHistory} style={{ marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
              <Text variant="body">Historial de membresías</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </View>
        </Card>

        {/* Theme preference */}
        <Card variant="default" style={{ marginBottom: spacing.lg }}>
          <Text variant="label" color={colors.textTertiary} style={{ marginBottom: spacing.md }}>
            Apariencia
          </Text>
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: colors.surfacePressed,
              borderRadius: radius.md,
              padding: spacing.xs,
            }}
          >
            {(['light', 'system', 'dark'] as ThemePreference[]).map((opt) => (
              <Pressable
                key={opt}
                onPress={() => setMode(opt)}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  paddingVertical: spacing.sm,
                  borderRadius: radius.sm,
                  backgroundColor: preference === opt ? colors.surface : 'transparent',
                }}
                accessibilityRole="button"
                accessibilityLabel={`Tema ${opt}`}
              >
                <Ionicons
                  name={opt === 'light' ? 'sunny-outline' : opt === 'dark' ? 'moon-outline' : 'phone-portrait-outline'}
                  size={16}
                  color={preference === opt ? colors.primary : colors.textTertiary}
                />
                <Text
                  variant="overline"
                  color={preference === opt ? colors.primary : colors.textTertiary}
                  style={{ marginTop: 2 }}
                >
                  {opt === 'light' ? 'Claro' : opt === 'dark' ? 'Oscuro' : 'Sistema'}
                </Text>
              </Pressable>
            ))}
          </View>
        </Card>

        {/* App info */}
        <Card variant="default" style={{ marginBottom: spacing.xl }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="caption" color={colors.textTertiary}>Versión</Text>
            <Text variant="caption">1.0.0</Text>
          </View>
          <Text variant="overline" color={colors.textTertiary} align="center" style={{ marginTop: spacing.md }}>
            Desarrollado con amor para tu gimnasio.
          </Text>
        </Card>

        <Button variant="destructive" fullWidth icon="log-out-outline" haptic onPress={handleLogout}>
          Cerrar sesión
        </Button>
      </ScrollView>

      {/* History bottom sheet */}
      <BottomSheet
        visible={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title="Historial de membresías"
        snapPoints={[0.6]}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing['2xl'] }}>
          {histLoading ? (
            <Text variant="body" color={colors.textTertiary} align="center" style={{ marginTop: spacing.xl }}>
              Cargando...
            </Text>
          ) : history.length === 0 ? (
            <Text variant="body" color={colors.textTertiary} align="center" style={{ marginTop: spacing.xl }}>
              Sin historial.
            </Text>
          ) : (
            history.map((h) => (
              <Card
                key={h.id}
                variant={h.isCurrent ? 'elevated' : 'default'}
                style={{
                  marginBottom: spacing.sm,
                  borderColor: h.isCurrent ? colors.primary + '44' : colors.border,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs }}>
                  <Text variant="body" weight="bold">{h.plan.name}</Text>
                  <Badge
                    variant={h.status === 'ACTIVE' ? 'success' : h.status === 'EXPIRED' ? 'warning' : 'destructive'}
                    label={h.status}
                  />
                </View>
                <Text variant="caption" color={colors.textSecondary}>
                  {new Date(h.startDate).toLocaleDateString('es')} — {new Date(h.endDate).toLocaleDateString('es')}
                </Text>
              </Card>
            ))
          )}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

export const ProfileTab = memo(ProfileTabInner);
