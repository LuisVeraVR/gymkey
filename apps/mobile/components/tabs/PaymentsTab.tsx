import { memo, useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { fetchMyPayments } from '../../memberApi';
import { useTheme } from '../../context/ThemeContext';
import { spacing, radius } from '../../theme';
import { Text } from '../ui/Text';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';

type PaymentRow = {
  id: string;
  amount: unknown;
  currency: string;
  status: string;
  method: string;
  createdAt: string;
};

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

function statusVariant(s: string): 'success' | 'warning' | 'destructive' {
  switch (s) {
    case 'COMPLETED': return 'success';
    case 'PENDING': return 'warning';
    default: return 'destructive';
  }
}

function statusLabel(s: string) {
  const m: Record<string, string> = { PENDING: 'Pendiente', COMPLETED: 'Completado', FAILED: 'Fallido', REFUNDED: 'Reembolsado' };
  return m[s] || s;
}

function methodIcon(method: string): keyof typeof Ionicons.glyphMap {
  if (method.toLowerCase().includes('cash') || method.toLowerCase().includes('efectivo')) return 'cash-outline';
  if (method.toLowerCase().includes('card') || method.toLowerCase().includes('tarjeta')) return 'card-outline';
  return 'swap-horizontal-outline';
}

function PaymentsTabInner() {
  const { colors } = useTheme();
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchMyPayments();
      setRows(data);
    } catch {
      setRows([]);
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

  if (loading) {
    return (
      <View style={{ flex: 1, padding: spacing.lg, gap: spacing.md }}>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <Skeleton width="48%" height={80} />
          <Skeleton width="48%" height={80} />
        </View>
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} width="100%" height={64} />)}
      </View>
    );
  }

  if (!rows.length) {
    return (
      <EmptyState
        icon="receipt-outline"
        title="Sin pagos"
        description="Tus pagos aparecerán aquí cuando realices transacciones."
      />
    );
  }

  const totalPaid = rows
    .filter((r) => r.status === 'COMPLETED')
    .reduce((sum, r) => {
      const n = typeof r.amount === 'string' ? parseFloat(r.amount) : Number(r.amount);
      return sum + (Number.isNaN(n) ? 0 : n);
    }, 0);

  const lastPayment = rows[0];

  return (
    <ScrollView
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['3xl'] }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <Text variant="h2" style={{ marginBottom: spacing.lg }}>Mis pagos</Text>

      {/* Stats row */}
      <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl }}>
        <Card variant="elevated" padding="md" style={{ flex: 1 }}>
          <Text variant="overline" color={colors.textTertiary}>Total pagado</Text>
          <Text variant="h3" color={colors.primary} style={{ marginTop: spacing.xs }}>
            {formatMoney(totalPaid, '')}
          </Text>
        </Card>
        <Card variant="elevated" padding="md" style={{ flex: 1 }}>
          <Text variant="overline" color={colors.textTertiary}>Último pago</Text>
          <Text variant="caption" style={{ marginTop: spacing.xs }}>
            {lastPayment ? new Date(lastPayment.createdAt).toLocaleDateString('es') : '-'}
          </Text>
        </Card>
      </View>

      {/* Payments list */}
      <Card variant="default" padding="xs">
        {rows.map((p, i) => (
          <Animated.View
            key={p.id}
            entering={FadeInUp.delay(Math.min(i * 40, 400)).duration(250)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.md,
              borderBottomWidth: i < rows.length - 1 ? 1 : 0,
              borderBottomColor: colors.separator,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.surfaceElevated,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={methodIcon(p.method)} size={20} color={colors.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="body" weight="bold">{formatMoney(p.amount, p.currency)}</Text>
              <Text variant="caption" color={colors.textTertiary}>
                {p.method} · {new Date(p.createdAt).toLocaleDateString('es')}
              </Text>
            </View>
            <Badge variant={statusVariant(p.status)} label={statusLabel(p.status)} />
          </Animated.View>
        ))}
      </Card>
    </ScrollView>
  );
}

export const PaymentsTab = memo(PaymentsTabInner);
