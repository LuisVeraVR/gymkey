import { ActivityIndicator, Platform, Pressable, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { fontSize, fontWeight, radius, spacing } from '../../theme';
import { Text } from './Text';
import { useMemo } from 'react';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

type Props = {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  disabled?: boolean;
  haptic?: boolean;
  onPress?: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

const sizeMap: Record<Size, { py: number; px: number; fs: number; icon: number }> = {
  sm: { py: spacing.sm, px: spacing.md, fs: fontSize.sm, icon: 16 },
  md: { py: spacing.md, px: spacing.lg, fs: fontSize.base, icon: 18 },
  lg: { py: spacing.lg - 2, px: spacing.xl, fs: fontSize.base, icon: 20 },
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  disabled = false,
  haptic = false,
  onPress,
  children,
  style,
  accessibilityLabel,
}: Props) {
  const { colors, isDark } = useTheme();
  const scaleVal = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleVal.value }],
  }));

  const s = sizeMap[size];

  const variantStyle = useMemo(() => {
    switch (variant) {
      case 'primary':
        return {
          bg: colors.primary,
          bgPressed: colors.primaryPressed,
          fg: colors.textInverse,
          border: 'transparent',
        };
      case 'secondary':
        return {
          bg: colors.surfaceElevated,
          bgPressed: colors.surfacePressed,
          fg: colors.primary,
          border: colors.border,
        };
      case 'outline':
        return {
          bg: 'transparent',
          bgPressed: colors.primarySurface,
          fg: colors.primary,
          border: colors.primary,
        };
      case 'ghost':
        return {
          bg: 'transparent',
          bgPressed: colors.primarySurface,
          fg: colors.primary,
          border: 'transparent',
        };
      case 'destructive':
        return {
          bg: colors.destructive,
          bgPressed: '#dc2626',
          fg: colors.textInverse,
          border: 'transparent',
        };
    }
  }, [variant, colors, isDark]);

  const handlePressIn = () => {
    scaleVal.value = withSpring(0.97, { damping: 15, stiffness: 300 });
    if (haptic && Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePressOut = () => {
    scaleVal.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const iconEl = icon && !loading ? (
    <Ionicons name={icon} size={s.icon} color={variantStyle.fg} />
  ) : null;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
    >
      <Animated.View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
            paddingVertical: s.py,
            paddingHorizontal: s.px,
            borderRadius: radius.md,
            borderWidth: variantStyle.border === 'transparent' ? 0 : 1,
            borderColor: variantStyle.border,
            backgroundColor: variantStyle.bg,
            opacity: disabled ? 0.5 : 1,
            alignSelf: fullWidth ? 'stretch' : 'auto',
          },
          animStyle,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={variantStyle.fg} />
        ) : (
          <>
            {iconPosition === 'left' && iconEl}
            <Text
              variant="label"
              color={variantStyle.fg}
              weight="bold"
              style={{ fontSize: s.fs }}
            >
              {children}
            </Text>
            {iconPosition === 'right' && iconEl}
          </>
        )}
      </Animated.View>
    </Pressable>
  );
}
