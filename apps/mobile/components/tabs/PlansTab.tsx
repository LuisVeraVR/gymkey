import { memo, useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { fetchPlans, subscribeToPlan } from '../../memberApi';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { fontSize, spacing, radius } from '../../theme';
import { Text } from '../ui/Text';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';

type Plan = {
  id: string;
  name: string;
  price: unknown;
  description?: string | null;
  duration?: number;
  durationDays?: number;
  features?: string[];
};

type Subscription = { status: string; planId?: string } | null;

function formatMoney(amount: unknown, _currency: string) {
  const n = typeof amount === 'string' ? parseFloat(amount) : Number(amount);
  if (Number.isNaN(n)) return String(amount);
  try {
    return new Intl.NumberFormat('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return String(Math.round(n));
  }
}

function PlansTabInner({
  subscription,
  onChanged,
}: {
  subscription: Subscription;
  onChanged: () => void;
}) {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const rows = await fetchPlans();
      setPlans(rows);
    } catch {
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleSubscribe = async (planId: string) => {
    setBusyId(planId);
    try {
      await subscribeToPlan(planId);
      showToast('success', 'Suscripción actualizada.');
      onChanged();
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'response' in e
        ? (e as { response?: { data?: { message?: unknown } } }).response?.data?.message
        : null;
      const text = typeof msg === 'string' ? msg : Array.isArray(msg) ? msg.join(', ') : 'No se pudo suscribir.';
      showToast('error', text);
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, padding: spacing.lg, gap: spacing.lg }}>
        <Skeleton width="100%" height={220} />
        <Skeleton width="100%" height={220} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['3xl'] }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <Text variant="h2" style={{ marginBottom: spacing.sm }}>Planes</Text>
      <Text variant="caption" color={colors.textTertiary} style={{ marginBottom: spacing.xl }}>
        Para cambiar de plan o pagar, acércate a recepción.
      </Text>

      {plans.map((plan, i) => {
        const days = plan.durationDays ?? plan.duration ?? 30;
        const priceLabel = formatMoney(plan.price, 'USD');
        const isCurrent = subscription?.planId === plan.id;
        const features = plan.features ?? [plan.description || 'Acceso al gimnasio'];

        return (
          <Animated.View key={plan.id} entering={FadeInUp.delay(Math.min(i * 80, 400)).duration(300)}>
            <Card variant="elevated" style={{ marginBottom: spacing.lg, overflow: 'hidden' }}>
              {isCurrent ? (
                <View
                  style={{
                    position: 'absolute',
                    top: 12,
                    right: -28,
                    backgroundColor: colors.primary,
                    paddingHorizontal: spacing['2xl'],
                    paddingVertical: spacing.xs,
                    transform: [{ rotate: '45deg' }],
                    zIndex: 1,
                  }}
                >
                  <Text variant="overline" color={colors.textInverse} weight="bold">
                    Tu plan
                  </Text>
                </View>
              ) : null}

              <Text variant="h3" style={{ marginBottom: spacing.sm }}>{plan.name}</Text>

              <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: spacing.md }}>
                <Text variant="h1" color={colors.primary} style={{ fontSize: fontSize['4xl'] }}>
                  {priceLabel}
                </Text>
                <Text variant="caption" color={colors.textTertiary}> / mes</Text>
              </View>

              {features.map((f, fi) => (
                <View key={fi} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs }}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                  <Text variant="body" color={colors.textSecondary}>{f}</Text>
                </View>
              ))}

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm, marginBottom: spacing.lg }}>
                <Ionicons name="calendar-outline" size={16} color={colors.textTertiary} />
                <Text variant="caption" color={colors.textTertiary}>{days} días de acceso</Text>
              </View>

              <Button
                variant={isCurrent ? 'secondary' : 'primary'}
                fullWidth
                disabled={isCurrent || busyId === plan.id}
                loading={busyId === plan.id}
                onPress={() => handleSubscribe(plan.id)}
              >
                {isCurrent ? 'Plan actual' : 'Suscribirse'}
              </Button>
            </Card>
          </Animated.View>
        );
      })}
    </ScrollView>
  );
}

export const PlansTab = memo(PlansTabInner);
