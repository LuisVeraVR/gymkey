import { useCallback, useRef } from 'react';
import { TextInput, View, Pressable, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { fontSize, fontWeight, radius, spacing } from '../../theme';

type Props = {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  style?: ViewStyle;
};

function Cell({
  char,
  active,
  filled,
}: {
  char: string;
  active: boolean;
  filled: boolean;
}) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  if (filled && scale.value === 1) {
    scale.value = withSpring(1.08, { damping: 12 }, () => {
      scale.value = withSpring(1, { damping: 12 });
    });
  }

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          width: 48,
          height: 56,
          borderRadius: radius.md,
          borderWidth: active ? 2 : 1,
          borderColor: active
            ? colors.primary
            : filled
              ? colors.borderStrong
              : colors.inputBorder,
          backgroundColor: filled ? colors.surfaceElevated : colors.inputBackground,
          alignItems: 'center',
          justifyContent: 'center',
        },
        animStyle,
      ]}
    >
      <Animated.Text
        style={{
          fontSize: fontSize['2xl'],
          fontWeight: fontWeight.bold,
          color: colors.text,
        }}
      >
        {char}
      </Animated.Text>
    </Animated.View>
  );
}

export function OtpInput({ length = 6, value, onChange, style }: Props) {
  const inputRef = useRef<TextInput>(null);

  const handleChange = useCallback(
    (text: string) => {
      const digits = text.replace(/\D/g, '').slice(0, length);
      onChange(digits);
    },
    [length, onChange],
  );

  const chars = value.padEnd(length, ' ').split('');

  return (
    <Pressable onPress={() => inputRef.current?.focus()} style={style}>
      <View style={{ flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' }}>
        {chars.map((c, i) => (
          <Cell
            key={i}
            char={c.trim()}
            active={i === value.length}
            filled={!!c.trim()}
          />
        ))}
      </View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={length}
        style={{ position: 'absolute', opacity: 0, height: 1, width: 1 }}
        autoFocus
      />
    </Pressable>
  );
}
