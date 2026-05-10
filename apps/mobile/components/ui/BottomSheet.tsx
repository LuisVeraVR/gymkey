import { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Pressable, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { radius, spacing } from '../../theme';
import { Text } from './Text';

const SCREEN_H = Dimensions.get('window').height;

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  snapPoints?: number[];
  children: React.ReactNode;
};

export function BottomSheet({
  visible,
  onClose,
  title,
  snapPoints = [0.6],
  children,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const maxSnap = Math.max(...snapPoints);
  const sheetHeight = SCREEN_H * maxSnap;
  const [mounted, setMounted] = useState(visible);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const translateY = useSharedValue(sheetHeight);
  const overlayOpacity = useSharedValue(0);

  useEffect(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (visible) {
      setMounted(true);
    }
    if (visible) {
      translateY.value = withTiming(0, {
        duration: 320,
        easing: Easing.out(Easing.cubic),
      });
      overlayOpacity.value = withTiming(1, { duration: 300 });
    } else {
      translateY.value = withTiming(sheetHeight, {
        duration: 320,
        easing: Easing.inOut(Easing.cubic),
      });
      overlayOpacity.value = withTiming(0, { duration: 320 });
      hideTimerRef.current = setTimeout(() => {
        setMounted(false);
      }, 330);
    }
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [visible, sheetHeight, translateY, overlayOpacity]);

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .onUpdate((e) => {
          if (e.translationY > 0) {
            translateY.value = e.translationY;
          }
        })
        .onEnd((e) => {
          if (e.translationY > sheetHeight * 0.3 || e.velocityY > 800) {
            translateY.value = withTiming(sheetHeight, {
              duration: 280,
              easing: Easing.out(Easing.cubic),
            });
            overlayOpacity.value = withTiming(0, { duration: 280 });
            runOnJS(onClose)();
          } else {
            translateY.value = withTiming(0, {
              duration: 220,
              easing: Easing.out(Easing.cubic),
            });
          }
        }),
    [sheetHeight, onClose, translateY, overlayOpacity],
  );

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  if (!mounted) return null;

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }}>
      <Pressable onPress={onClose} style={{ flex: 1 }}>
        <Animated.View
          style={[
            { flex: 1, backgroundColor: colors.overlay },
            overlayStyle,
          ]}
        />
      </Pressable>
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[
            {
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: sheetHeight + insets.bottom,
              backgroundColor: colors.surface,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              borderWidth: 1,
              borderBottomWidth: 0,
              borderColor: colors.border,
              paddingBottom: insets.bottom,
            },
            sheetStyle,
          ]}
        >
          <View style={{ alignItems: 'center', paddingTop: spacing.sm }}>
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: colors.borderStrong,
              }}
            />
          </View>
          {title ? (
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingHorizontal: spacing.xl,
                paddingTop: spacing.md,
                paddingBottom: spacing.sm,
              }}
            >
              <Text variant="h3">{title}</Text>
              <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Cerrar" accessibilityRole="button">
                <Text variant="body" color={colors.textTertiary}>
                  Cerrar
                </Text>
              </Pressable>
            </View>
          ) : null}
          <View style={{ flex: 1, paddingHorizontal: spacing.xl }}>
            {children}
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
