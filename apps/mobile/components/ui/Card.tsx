import { useMemo } from 'react';
import { Platform, Pressable, View, type ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { radius, spacing, type ColorPalette } from '../../theme';

type Variant = 'default' | 'elevated' | 'outlined';

type Props = {
  variant?: Variant;
  padding?: keyof typeof spacing;
  onPress?: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
};

function getCardStyle(v: Variant, colors: ColorPalette, isDark: boolean): ViewStyle {
  const base: ViewStyle = {
    borderRadius: radius.lg,
  };
  switch (v) {
    case 'default':
      return { ...base, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border };
    case 'elevated':
      return {
        ...base,
        backgroundColor: colors.surfaceElevated,
        ...(isDark
          ? { borderWidth: 1, borderColor: colors.borderStrong }
          : Platform.select({
              ios: {
                shadowColor: colors.shadowColor,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
              },
              android: { elevation: 3 },
              default: {},
            })),
      };
    case 'outlined':
      return { ...base, backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.borderStrong };
  }
}

export function Card({ variant = 'default', padding = 'lg', onPress, children, style }: Props) {
  const { colors, isDark } = useTheme();
  const cardStyle = useMemo(() => getCardStyle(variant, colors, isDark), [variant, colors, isDark]);
  const pad = spacing[padding];

  const inner = (
    <View style={[cardStyle, { padding: pad }, style]}>{children}</View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
        {inner}
      </Pressable>
    );
  }
  return inner;
}
