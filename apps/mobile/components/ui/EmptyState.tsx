import { View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { spacing } from '../../theme';
import { Text } from './Text';
import { Button } from './Button';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  action?: { label: string; onPress: () => void };
  style?: ViewStyle;
};

export function EmptyState({ icon, title, description, action, style }: Props) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: spacing['3xl'],
        },
        style,
      ]}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: colors.surfaceElevated,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.xl,
        }}
      >
        <Ionicons name={icon} size={32} color={colors.textTertiary} />
      </View>
      <Text variant="h3" align="center" style={{ marginBottom: spacing.sm }}>
        {title}
      </Text>
      <Text
        variant="body"
        color={colors.textSecondary}
        align="center"
        style={{ lineHeight: 22 }}
      >
        {description}
      </Text>
      {action ? (
        <View style={{ marginTop: spacing.xl }}>
          <Button variant="primary" onPress={action.onPress}>
            {action.label}
          </Button>
        </View>
      ) : null}
    </View>
  );
}
