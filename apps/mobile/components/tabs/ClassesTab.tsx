import { memo, useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import {
  fetchClasses,
  fetchMyClassBookings,
  bookClass,
  cancelClassBooking,
  type GymClassDto,
  type ClassBookingDto,
} from '../../memberApi';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { spacing } from '../../theme';
import { Text } from '../ui/Text';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';

function computeNextClassDate(row: GymClassDto) {
  if (row.nextDate) return row.nextDate;
  const now = new Date();
  for (let i = 0; i < 21; i += 1) {
    const candidate = new Date(now);
    candidate.setDate(candidate.getDate() + i);
    if (!row.dayOfWeek.includes(candidate.getDay())) continue;
    const [h, m] = row.startTime.split(':').map((v) => Number(v));
    candidate.setHours(h || 0, m || 0, 0, 0);
    if (candidate > now) return candidate.toISOString();
  }
  return null;
}

function shortDays(days: number[]) {
  const labels = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
  return days.slice().sort((a, b) => a - b).map((d) => labels[d] || d).join(', ');
}

function extractApiError(e: unknown): string {
  if (e && typeof e === 'object' && 'response' in e) {
    const msg = (e as { response?: { data?: { message?: unknown } } }).response?.data?.message;
    if (typeof msg === 'string') return msg;
    if (Array.isArray(msg)) return msg.join(', ');
  }
  return 'Ocurrió un error';
}

function ClassesTabInner() {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [classes, setClasses] = useState<GymClassDto[]>([]);
  const [bookings, setBookings] = useState<ClassBookingDto[]>([]);

  const load = useCallback(async () => {
    try {
      const [rows, mine] = await Promise.all([
        fetchClasses(),
        fetchMyClassBookings().catch(() => []),
      ]);
      setClasses(rows);
      setBookings(mine);
    } catch {
      setClasses([]);
      setBookings([]);
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

  const reserve = async (row: GymClassDto) => {
    const nextDate = computeNextClassDate(row);
    if (!nextDate) { showToast('warning', 'No se pudo calcular la próxima fecha.'); return; }
    setBusyId(row.id);
    try {
      await bookClass(row.id, nextDate);
      await load();
      showToast('success', 'Reserva creada.');
    } catch (e) {
      showToast('error', extractApiError(e));
    } finally {
      setBusyId(null);
    }
  };

  const cancel = async (booking: ClassBookingDto) => {
    const classId = booking.classId || booking.gymClass?.id;
    if (!classId) return;
    Alert.alert('Cancelar reserva', '¿Estás seguro?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí, cancelar',
        style: 'destructive',
        onPress: async () => {
          setBusyId(booking.id);
          try {
            await cancelClassBooking(classId, booking.date);
            await load();
            showToast('success', 'Reserva cancelada.');
          } catch (e) {
            showToast('error', extractApiError(e));
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, padding: spacing.lg, gap: spacing.md }}>
        {[0, 1, 2].map((i) => <Skeleton key={i} width="100%" height={120} />)}
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing['3xl'] }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      <Text variant="h3" style={{ marginBottom: spacing.md }}>Clases disponibles</Text>
      {classes.length === 0 ? (
        <Text variant="body" color={colors.textSecondary} align="center">
          No hay clases disponibles.
        </Text>
      ) : (
        classes.map((row, i) => {
          const reserved = bookings.some(
            (b) => (b.classId || b.gymClass?.id) === row.id && b.status !== 'CANCELED' && b.status !== 'NO_SHOW',
          );
          const nextDate = computeNextClassDate(row);
          return (
            <Animated.View key={row.id} entering={FadeInUp.delay(Math.min(i * 50, 500)).duration(300)}>
              <Card variant="elevated" style={{ marginBottom: spacing.md }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs }}>
                  <Text variant="h3">{row.name}</Text>
                  <Badge variant="neutral" label={`${row.occupied || 0}/${row.capacity}`} />
                </View>
                <Text variant="caption" color={colors.textSecondary}>
                  Coach: {row.coach?.name || row.coach?.email || 'Sin coach'}
                </Text>
                <Text variant="caption" color={colors.textSecondary}>
                  {shortDays(row.dayOfWeek)} · {row.startTime} · {row.duration} min
                </Text>
                <Text variant="overline" color={colors.textTertiary} style={{ marginTop: spacing.xs, marginBottom: spacing.md }}>
                  {nextDate ? `Próxima: ${new Date(nextDate).toLocaleString('es')}` : 'Próxima: N/D'}
                </Text>
                <Button
                  variant={reserved ? 'secondary' : 'primary'}
                  size="sm"
                  fullWidth
                  disabled={reserved || busyId === row.id}
                  loading={busyId === row.id}
                  onPress={() => reserve(row)}
                >
                  {reserved ? 'Ya reservada' : 'Reservar'}
                </Button>
              </Card>
            </Animated.View>
          );
        })
      )}

      {bookings.length > 0 ? (
        <>
          <Text variant="h3" style={{ marginTop: spacing.lg, marginBottom: spacing.md }}>
            Mis reservas
          </Text>
          {bookings.map((b, i) => (
            <Animated.View key={b.id} entering={FadeInUp.delay(Math.min(i * 50, 500)).duration(300)}>
              <Card variant="default" style={{ marginBottom: spacing.md }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs }}>
                  <Text variant="body" weight="bold">{b.gymClass?.name || 'Clase'}</Text>
                  <Badge
                    variant={
                      b.status === 'CONFIRMED' ? 'warning' : b.status === 'ATTENDED' ? 'success' : 'destructive'
                    }
                    label={b.status}
                  />
                </View>
                <Text variant="caption" color={colors.textSecondary}>
                  {new Date(b.date).toLocaleString('es')}
                </Text>
                {(b.status === 'CONFIRMED' || b.status === 'ATTENDED') ? (
                  <View style={{ marginTop: spacing.sm }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busyId === b.id}
                      loading={busyId === b.id}
                      onPress={() => cancel(b)}
                    >
                      Cancelar reserva
                    </Button>
                  </View>
                ) : null}
              </Card>
            </Animated.View>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

export const ClassesTab = memo(ClassesTabInner);
