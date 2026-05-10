import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { fontSize, fontWeight } from '../../theme';

type Variant = 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'label' | 'overline';

type Props = RNTextProps & {
  variant?: Variant;
  color?: string;
  weight?: keyof typeof fontWeight;
  align?: 'left' | 'center' | 'right';
};

const variantStyles: Record<Variant, { size: number; weight: string }> = {
  h1: { size: fontSize['3xl'], weight: fontWeight.extrabold },
  h2: { size: fontSize['2xl'], weight: fontWeight.bold },
  h3: { size: fontSize.xl, weight: fontWeight.bold },
  body: { size: fontSize.base, weight: fontWeight.normal },
  caption: { size: fontSize.sm, weight: fontWeight.normal },
  label: { size: fontSize.sm, weight: fontWeight.semibold },
  overline: { size: fontSize.xs, weight: fontWeight.semibold },
};

const secondaryVariants = new Set<Variant>(['caption', 'overline']);

export function Text({
  variant = 'body',
  color,
  weight: weightOverride,
  align,
  style,
  ...rest
}: Props) {
  const { colors } = useTheme();
  const v = variantStyles[variant];
  const defaultColor = secondaryVariants.has(variant) ? colors.textSecondary : colors.text;

  return (
    <RNText
      style={[
        {
          fontSize: v.size,
          fontWeight: (weightOverride ? fontWeight[weightOverride] : v.weight) as RNTextProps['style'] extends { fontWeight?: infer F } ? F : never,
          color: color ?? defaultColor,
          textAlign: align,
        },
        style,
      ]}
      {...rest}
    />
  );
}
