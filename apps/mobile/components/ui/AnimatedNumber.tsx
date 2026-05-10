import { useEffect } from 'react';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { TextInput } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { fontSize as themeFontSize, fontWeight as themeFontWeight } from '../../theme';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

type Props = {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  fontSize?: number;
  color?: string;
  weight?: keyof typeof themeFontWeight;
};

export function AnimatedNumber({
  value,
  duration = 600,
  prefix = '',
  suffix = '',
  decimals = 0,
  fontSize = themeFontSize.xl,
  color,
  weight = 'bold',
}: Props) {
  const { colors } = useTheme();
  const animValue = useSharedValue(0);

  useEffect(() => {
    animValue.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.ease),
    });
  }, [value, duration, animValue]);

  const animatedProps = useAnimatedProps(() => {
    const num = decimals > 0
      ? animValue.value.toFixed(decimals)
      : Math.round(animValue.value).toString();
    return {
      text: `${prefix}${num}${suffix}`,
      defaultValue: `${prefix}${num}${suffix}`,
    };
  });

  return (
    <AnimatedTextInput
      editable={false}
      underlineColorAndroid="transparent"
      animatedProps={animatedProps}
      style={{
        fontSize,
        fontWeight: themeFontWeight[weight],
        color: color ?? colors.text,
        padding: 0,
      }}
    />
  );
}
