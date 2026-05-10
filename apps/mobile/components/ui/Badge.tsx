import { useMemo } from 'react';
import { View, type ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { fontSize, fontWeight, radius, spacing, type ColorPalette } from '../../theme';
import { Text } from './Text';

type Variant = 'success' | 'warning' | 'destructive' | 'info' | 'primary' | 'neutral';
type Size = 'sm' | 'md';

type Props = {
  variant: Variant;
  label: string;
  size?: Size;
  style?: ViewStyle;
};

function getColors(v: Variant, c: ColorPalette) {
  switch (v) {
    case 'success': return { bg: c.successSurface, fg: c.success };
    case 'warning': return { bg: c.warningSurface, fg: c.warning };
    case 'destructive': return { bg: c.destructiveSurface, fg: c.destructive };
    case 'info': return { bg: c.infoSurface, fg: c.info };
    case 'primary': return { bg: c.primarySurface, fg: c.primary };
    case 'neutral': return { bg: c.surfaceElevated, fg: c.textSecondary };
  }
}

export function Badge({ variant, label, size = 'sm', style }: Props) {
  const { colors } = useTheme();
  const vc = useMemo(() => getColors(variant, colors), [variant, colors]);
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        {
          backgroundColor: vc.bg,
          paddingHorizontal: isSmall ? spacing.sm : spacing.md,
          paddingVertical: isSmall ? spacing.xs - 1 : spacing.xs + 1,
          borderRadius: radius.full,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      <Text
        variant="overline"
        color={vc.fg}
        weight="semibold"
        style={{ fontSize: isSmall ? fontSize.xs : fontSize.sm }}
      >
        {label}
      </Text>
    </View>
  );
}
