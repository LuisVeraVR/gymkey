import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from './ThemeContext';
import { fontSize, fontWeight, radius, spacing } from '../theme';

type ToastType = 'success' | 'error' | 'info' | 'warning';

type ToastItem = {
  id: number;
  type: ToastType;
  message: string;
};

type ToastContextValue = {
  showToast: (type: ToastType, message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

const iconMap: Record<ToastType, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  info: 'information-circle',
  warning: 'warning',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = ++nextId;
    setToasts((prev) => [...prev.slice(-4), { id, type, message }]);
    setTimeout(() => dismiss(id), 3000);
  }, [dismiss]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  const colorForType = useCallback(
    (type: ToastType) => {
      switch (type) {
        case 'success': return { bg: colors.successSurface, fg: colors.success };
        case 'error': return { bg: colors.destructiveSurface, fg: colors.destructive };
        case 'warning': return { bg: colors.warningSurface, fg: colors.warning };
        case 'info': return { bg: colors.infoSurface, fg: colors.info };
      }
    },
    [colors],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View style={[styles.container, { top: insets.top + spacing.sm }]} pointerEvents="box-none">
        {toasts.map((t) => {
          const c = colorForType(t.type);
          return (
            <Animated.View
              key={t.id}
              entering={FadeInUp.duration(250)}
              exiting={FadeOutUp.duration(200)}
              style={[
                styles.toast,
                {
                  backgroundColor: c.bg,
                  borderColor: c.fg + '33',
                },
              ]}
            >
              <Ionicons name={iconMap[t.type]} size={20} color={c.fg} />
              <Animated.Text
                style={[styles.message, { color: c.fg }]}
                numberOfLines={2}
              >
                {t.message}
              </Animated.Text>
              <Pressable
                onPress={() => dismiss(t.id)}
                hitSlop={8}
                accessibilityLabel="Cerrar"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={18} color={c.fg} />
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 9999,
    gap: spacing.sm,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  message: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
});
