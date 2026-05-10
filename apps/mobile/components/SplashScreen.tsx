import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { spacing } from '../theme';

type Props = {
  onReady?: () => void;
};

export function SplashScreen({ onReady }: Props) {
  const pulse = useSharedValue(1);
  const barWidth = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1.15, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    barWidth.value = withTiming(1, { duration: 2000, easing: Easing.out(Easing.ease) });
  }, [pulse, barWidth]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const barStyle = useAnimatedStyle(() => ({
    width: `${barWidth.value * 100}%` as `${number}%`,
  }));

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#030303',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Animated.View style={pulseStyle}>
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            backgroundColor: '#052e16',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="key" size={40} color="#10b981" />
        </View>
      </Animated.View>
      <Animated.Text
        style={{
          color: '#fafafa',
          fontSize: 28,
          fontWeight: '800',
          marginTop: spacing.xl,
        }}
      >
        GymKey
      </Animated.Text>
      <View
        style={{
          width: 120,
          height: 3,
          borderRadius: 2,
          backgroundColor: '#1f1f22',
          marginTop: spacing.xl,
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={[
            {
              height: 3,
              borderRadius: 2,
              backgroundColor: '#10b981',
            },
            barStyle,
          ]}
        />
      </View>
    </View>
  );
}
