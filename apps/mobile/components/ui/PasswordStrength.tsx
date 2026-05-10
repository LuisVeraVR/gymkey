import { useMemo } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { radius, spacing } from '../../theme';
import { Text } from './Text';

type Props = {
  password: string;
  style?: ViewStyle;
};

type Rule = { label: string; test: (p: string) => boolean };

const rules: Rule[] = [
  { label: 'Mínimo 8 caracteres', test: (p) => p.length >= 8 },
  { label: 'Al menos una mayúscula', test: (p) => /[A-Z]/.test(p) },
  { label: 'Al menos un número', test: (p) => /\d/.test(p) },
];

export function PasswordStrength({ password, style }: Props) {
  const { colors } = useTheme();

  const passed = useMemo(
    () => rules.map((r) => r.test(password)),
    [password],
  );

  const passedCount = passed.filter(Boolean).length;
  const strengthColor =
    passedCount === 0
      ? colors.border
      : passedCount === 1
        ? colors.destructive
        : passedCount === 2
          ? colors.warning
          : colors.success;

  return (
    <View style={style}>
      <View
        style={{
          flexDirection: 'row',
          gap: spacing.xs,
          marginBottom: spacing.md,
        }}
      >
        {rules.map((_, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: radius.full,
              backgroundColor: i < passedCount ? strengthColor : colors.border,
            }}
          />
        ))}
      </View>
      {rules.map((r, i) => (
        <Animated.View
          key={i}
          entering={FadeIn.delay(i * 50).duration(200)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            marginBottom: spacing.xs,
          }}
        >
          <Ionicons
            name={passed[i] ? 'checkmark-circle' : 'ellipse-outline'}
            size={16}
            color={passed[i] ? colors.success : colors.textTertiary}
          />
          <Text
            variant="caption"
            color={passed[i] ? colors.success : colors.textTertiary}
          >
            {r.label}
          </Text>
        </Animated.View>
      ))}
    </View>
  );
}
