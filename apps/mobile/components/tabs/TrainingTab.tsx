import { memo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useGym } from '../../context/GymContext';
import { radius, spacing } from '../../theme';
import { Text } from '../ui/Text';
import { RoutinesTab } from './RoutinesTab';
import { ClassesTab } from './ClassesTab';
import { EmptyState } from '../ui/EmptyState';

function TrainingTabInner() {
  const { colors } = useTheme();
  const { hasFeature, isBillingBlocked } = useGym();
  const [subtab, setSubtab] = useState<'routines' | 'classes'>('routines');
  const classesEnabled = hasFeature('classBookings');

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: colors.surfacePressed,
          borderRadius: radius.md,
          padding: spacing.xs,
          marginHorizontal: spacing.lg,
          marginTop: spacing.sm,
          marginBottom: spacing.xs,
        }}
      >
        {(['routines', 'classes'] as const).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => {
              if (tab === 'classes' && !classesEnabled) return;
              setSubtab(tab);
            }}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: spacing.sm,
              borderRadius: radius.sm,
              backgroundColor: subtab === tab ? colors.surface : 'transparent',
              opacity: tab === 'classes' && !classesEnabled ? 0.45 : 1,
            }}
            accessibilityRole="button"
          >
            <Text
              variant="label"
              color={subtab === tab ? colors.primary : colors.textTertiary}
            >
              {tab === 'routines' ? 'Rutinas' : 'Clases Pro'}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={{ flex: 1 }}>
        {isBillingBlocked ? (
          <EmptyState
            icon="warning-outline"
            title="Suscripción del gimnasio inactiva"
            description="Contacta al administrador para reactivar GymKey."
          />
        ) : subtab === 'routines' ? (
          <RoutinesTab />
        ) : classesEnabled ? (
          <ClassesTab />
        ) : (
          <EmptyState
            icon="lock-closed"
            title="Clases no disponibles"
            description="Las clases y reservas están disponibles desde el plan Pro."
          />
        )}
      </View>
    </View>
  );
}

export const TrainingTab = memo(TrainingTabInner);
