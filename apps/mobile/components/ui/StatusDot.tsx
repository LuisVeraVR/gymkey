import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';

type Status = 'active' | 'inactive' | 'warning';

type Props = {
  status: Status;
  size?: number;
};

export function StatusDot({ status, size = 10 }: Props) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const opacityVal = useSharedValue(1);

  const color =
    status === 'active'
      ? colors.success
      : status === 'warning'
        ? colors.warning
        : colors.textTertiary;

  useEffect(() => {
    if (status === 'active') {
      scale.value = withRepeat(
        withTiming(1.3, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
      opacityVal.value = withRepeat(
        withTiming(0.5, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    } else {
      scale.value = 1;
      opacityVal.value = 1;
    }
  }, [status, scale, opacityVal]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacityVal.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        animStyle,
      ]}
      accessibilityElementsHidden
    />
  );
}
