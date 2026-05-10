import { useState, useMemo } from 'react';
import {
  Pressable,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { fontSize, fontWeight, radius, spacing } from '../../theme';
import { Text } from './Text';

type Props = TextInputProps & {
  label?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  secureToggle?: boolean;
  containerStyle?: ViewStyle;
};

export function Input({
  label,
  error,
  icon,
  secureToggle = false,
  containerStyle,
  style,
  onFocus,
  onBlur,
  secureTextEntry,
  ...rest
}: Props) {
  const { colors } = useTheme();
  const [showSecure, setShowSecure] = useState(!!secureTextEntry);
  const focusAnim = useSharedValue(0);

  const borderStyle = useAnimatedStyle(() => ({
    borderColor: error
      ? colors.destructive
      : focusAnim.value === 1
        ? colors.inputBorderFocused
        : colors.inputBorder,
  }));

  const inputStyles = useMemo(
    () => ({
      wrapper: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        backgroundColor: colors.inputBackground,
        borderWidth: 1,
        borderRadius: radius.md,
        overflow: 'hidden' as const,
      },
      input: {
        flex: 1,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md + 1,
        fontSize: fontSize.base,
        fontWeight: fontWeight.normal,
        color: colors.text,
      },
    }),
    [colors],
  );

  return (
    <View style={containerStyle}>
      {label ? (
        <Text variant="label" style={{ marginBottom: spacing.xs + 2 }}>
          {label}
        </Text>
      ) : null}
      <Animated.View style={[inputStyles.wrapper, borderStyle]}>
        {icon ? (
          <View style={{ paddingLeft: spacing.md }}>
            <Ionicons name={icon} size={18} color={colors.placeholder} />
          </View>
        ) : null}
        <TextInput
          placeholderTextColor={colors.placeholder}
          secureTextEntry={secureToggle ? showSecure : secureTextEntry}
          style={[inputStyles.input, style]}
          onFocus={(e) => {
            focusAnim.value = withTiming(1, { duration: 150 });
            onFocus?.(e);
          }}
          onBlur={(e) => {
            focusAnim.value = withTiming(0, { duration: 150 });
            onBlur?.(e);
          }}
          accessibilityLabel={label}
          {...rest}
        />
        {secureToggle ? (
          <Pressable
            onPress={() => setShowSecure((v) => !v)}
            style={{ paddingHorizontal: spacing.md }}
            accessibilityLabel={showSecure ? 'Mostrar contraseña' : 'Ocultar contraseña'}
            accessibilityRole="button"
            hitSlop={8}
          >
            <Ionicons
              name={showSecure ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={colors.placeholder}
            />
          </Pressable>
        ) : null}
      </Animated.View>
      {error ? (
        <Text
          variant="caption"
          color={colors.destructive}
          style={{ marginTop: spacing.xs }}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
