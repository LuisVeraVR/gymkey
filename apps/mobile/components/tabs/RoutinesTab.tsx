import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import {
  createMyRoutine,
  deleteMyRoutine,
  fetchMyRoutines,
  updateMyRoutine,
} from '../../memberApi';
import { useTheme } from '../../context/ThemeContext';
import { spacing } from '../../theme';
import { Text } from '../ui/Text';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import { BottomSheet } from '../ui/BottomSheet';
import { EmptyState } from '../ui/EmptyState';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

type RoutineRow = {
  id: string;
  name: string;
  content: unknown;
  createdAt?: string;
};

type Exercise = {
  name?: string;
  sets?: number;
  reps?: number;
  weight?: string | number;
  notes?: string;
};

type DraftExercise = {
  name: string;
  sets: string;
  reps: string;
  weight: string;
  notes: string;
};

function parseExercises(content: unknown): Exercise[] {
  if (Array.isArray(content)) return content;
  if (content && typeof content === 'object' && 'exercises' in content) {
    return (content as { exercises: Exercise[] }).exercises || [];
  }
  return [];
}

function getApiErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.message;
    if (typeof msg === 'string') return msg;
    if (Array.isArray(msg)) {
      const joined = msg.filter((x): x is string => typeof x === 'string').join(', ');
      if (joined) return joined;
    }
    if (typeof err.message === 'string' && err.message.trim()) return err.message;
  }
  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
}

function RoutineCard({ routine, index, onPress }: { routine: RoutineRow; index: number; onPress: () => void }) {
  const { colors } = useTheme();
  const exercises = parseExercises(routine.content);
  const preview = exercises.slice(0, 3);

  return (
    <Animated.View entering={FadeInUp.delay(Math.min(index * 50, 500)).duration(300)}>
      <Card variant="elevated" onPress={onPress} style={{ marginBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
          <Text variant="h3">{routine.name}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </View>
        {routine.createdAt ? (
          <Text variant="caption" color={colors.textTertiary} style={{ marginBottom: spacing.sm }}>
            {new Date(routine.createdAt).toLocaleDateString('es')}
          </Text>
        ) : null}
        {preview.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm }}>
            {preview.map((e, i) => (
              <Badge
                key={i}
                variant="neutral"
                label={`${e.name || 'Ejercicio'} ${e.sets ? `${e.sets}x${e.reps || '?'}` : ''}`}
              />
            ))}
          </View>
        ) : null}
        <Badge variant="primary" label={`${exercises.length} ejercicios`} />
      </Card>
    </Animated.View>
  );
}

function RoutinesTabInner() {
  const { colors } = useTheme();
  const [list, setList] = useState<RoutineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<RoutineRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [routineName, setRoutineName] = useState('');
  const [draftExercises, setDraftExercises] = useState<DraftExercise[]>([
    { name: '', sets: '', reps: '', weight: '', notes: '' },
  ]);

  const load = useCallback(async () => {
    try {
      const rows = await fetchMyRoutines();
      setList(rows);
    } catch {
      setList([]);
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

  const addDraftExercise = () => {
    setDraftExercises((prev) => [
      ...prev,
      { name: '', sets: '', reps: '', weight: '', notes: '' },
    ]);
  };

  const removeDraftExercise = (index: number) => {
    setDraftExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const updateDraftExercise = (
    index: number,
    field: keyof DraftExercise,
    value: string,
  ) => {
    setDraftExercises((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  };

  const resetDraft = () => {
    setRoutineName('');
    setEditingRoutineId(null);
    setDraftExercises([{ name: '', sets: '', reps: '', weight: '', notes: '' }]);
  };

  const canSave = useMemo(
    () =>
      routineName.trim().length > 1 &&
      draftExercises.some((x) => x.name.trim().length > 1),
    [routineName, draftExercises],
  );

  const onCreateRoutine = async () => {
    if (!canSave) {
      Alert.alert(
        'Faltan datos',
        'Agrega el nombre de la rutina y al menos un ejercicio con nombre.',
      );
      return;
    }
    setSaving(true);
    try {
      const exercises = draftExercises
        .map((x) => ({
          name: x.name.trim(),
          sets: x.sets ? Number(x.sets) : undefined,
          reps: x.reps ? Number(x.reps) : undefined,
          weight: x.weight.trim() || undefined,
          notes: x.notes.trim() || undefined,
        }))
        .filter((x) => x.name.length > 0);
      if (editingRoutineId) {
        await updateMyRoutine(editingRoutineId, {
          name: routineName.trim(),
          exercises,
        });
      } else {
        await createMyRoutine({
          name: routineName.trim(),
          exercises,
        });
      }
      setCreateOpen(false);
      resetDraft();
      setSelected(null);
      await load();
    } catch (e) {
      Alert.alert('Error', getApiErrorMessage(e, 'No se pudo guardar la rutina.'));
    } finally {
      setSaving(false);
    }
  };

  const onEditSelected = () => {
    if (!selected) return;
    const exercises = parseExercises(selected.content);
    setEditingRoutineId(selected.id);
    setRoutineName(selected.name || '');
    setDraftExercises(
      exercises.length
        ? exercises.map((e) => ({
            name: e.name || '',
            sets: e.sets ? String(e.sets) : '',
            reps: e.reps ? String(e.reps) : '',
            weight: e.weight ? String(e.weight) : '',
            notes: e.notes || '',
          }))
        : [{ name: '', sets: '', reps: '', weight: '', notes: '' }],
    );
    setSelected(null);
    setCreateOpen(true);
  };

  const onDeleteSelected = () => {
    if (!selected) return;
    Alert.alert(
      'Eliminar rutina',
      `¿Seguro que deseas eliminar "${selected.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMyRoutine(selected.id);
              setSelected(null);
              await load();
            } catch (e) {
              Alert.alert('Error', getApiErrorMessage(e, 'No se pudo eliminar la rutina.'));
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, padding: spacing.lg, gap: spacing.md }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} width="100%" height={110} />
        ))}
      </View>
    );
  }

  if (!list.length) {
    return (
      <View style={{ flex: 1 }}>
        <EmptyState
          icon="barbell-outline"
          title="Sin rutinas"
          description="Crea tu primera rutina personalizada."
        />
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}>
          <Button
            variant="primary"
            fullWidth
            icon="add-outline"
            onPress={() => setCreateOpen(true)}
          >
            Crear rutina
          </Button>
        </View>
      </View>
    );
  }

  const selectedExercises = selected ? parseExercises(selected.content) : [];

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
          <Text variant="h2">Mis rutinas</Text>
          <Button size="sm" icon="add-outline" onPress={() => setCreateOpen(true)}>
            Nueva
          </Button>
        </View>
        {list.map((r, i) => (
          <RoutineCard key={r.id} routine={r} index={i} onPress={() => setSelected(r)} />
        ))}
      </ScrollView>

      <BottomSheet
        visible={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name}
        snapPoints={[0.7]}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing['3xl'] }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Button variant="secondary" icon="create-outline" onPress={onEditSelected}>
                Editar
              </Button>
            </View>
            <View style={{ flex: 1 }}>
              <Button variant="destructive" icon="trash-outline" onPress={onDeleteSelected}>
                Eliminar
              </Button>
            </View>
          </View>
          {selectedExercises.map((e, i) => (
            <View
              key={i}
              style={{
                paddingVertical: spacing.md,
                borderBottomWidth: i < selectedExercises.length - 1 ? 1 : 0,
                borderBottomColor: colors.separator,
              }}
            >
              <Text variant="body" weight="bold">{e.name || `Ejercicio ${i + 1}`}</Text>
              <Text variant="caption" color={colors.textSecondary}>
                {e.sets ? `${e.sets} x ${e.reps || '?'}` : 'Sin detalle'}
              </Text>
              {e.weight ? <Badge variant="info" label={`${e.weight} kg`} style={{ marginTop: spacing.xs }} /> : null}
              {e.notes ? (
                <Text variant="caption" color={colors.textTertiary} style={{ fontStyle: 'italic', marginTop: spacing.xs }}>
                  {e.notes}
                </Text>
              ) : null}
            </View>
          ))}
        </ScrollView>
      </BottomSheet>

      <BottomSheet
        visible={createOpen}
        onClose={() => {
          setCreateOpen(false);
          resetDraft();
        }}
        title={editingRoutineId ? 'Editar rutina' : 'Nueva rutina'}
        snapPoints={[0.84]}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing['3xl'], gap: spacing.md }}>
          <Input
            label="Nombre de rutina"
            placeholder="Ej. Full Body 3 días"
            value={routineName}
            onChangeText={setRoutineName}
          />
          {draftExercises.map((exercise, index) => (
            <Card key={index} variant="outlined" style={{ marginTop: spacing.sm }}>
              <View style={{ gap: spacing.sm }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text variant="label" weight="bold">Ejercicio {index + 1}</Text>
                  {draftExercises.length > 1 ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon="trash-outline"
                      onPress={() => removeDraftExercise(index)}
                    >
                      Quitar
                    </Button>
                  ) : null}
                </View>
                <Input
                  label="Nombre"
                  placeholder="Ej. Press banca"
                  value={exercise.name}
                  onChangeText={(v) => updateDraftExercise(index, 'name', v)}
                />
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Series"
                      placeholder="4"
                      keyboardType="number-pad"
                      value={exercise.sets}
                      onChangeText={(v) => updateDraftExercise(index, 'sets', v.replace(/[^\d]/g, ''))}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Repeticiones"
                      placeholder="10"
                      keyboardType="number-pad"
                      value={exercise.reps}
                      onChangeText={(v) => updateDraftExercise(index, 'reps', v.replace(/[^\d]/g, ''))}
                    />
                  </View>
                </View>
                <Input
                  label="Peso (opcional)"
                  placeholder="Ej. 60kg"
                  value={exercise.weight}
                  onChangeText={(v) => updateDraftExercise(index, 'weight', v)}
                />
                <Input
                  label="Notas (opcional)"
                  placeholder="Controla la técnica y tempo."
                  value={exercise.notes}
                  onChangeText={(v) => updateDraftExercise(index, 'notes', v)}
                />
              </View>
            </Card>
          ))}
          <Button variant="secondary" icon="add-circle-outline" onPress={addDraftExercise}>
            Agregar ejercicio
          </Button>
          <Button
            variant="primary"
            loading={saving}
            disabled={!canSave}
            icon="save-outline"
            onPress={onCreateRoutine}
            fullWidth
          >
            {editingRoutineId ? 'Guardar cambios' : 'Guardar rutina'}
          </Button>
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

export const RoutinesTab = memo(RoutinesTabInner);
