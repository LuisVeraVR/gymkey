import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: '#030303' }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#450a0a', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
            <Ionicons name="warning-outline" size={32} color="#ef4444" />
          </View>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#fafafa', marginBottom: 8, textAlign: 'center' }}>
            Algo salió mal
          </Text>
          <Text style={{ fontSize: 14, color: '#a1a1aa', textAlign: 'center', marginBottom: 24, lineHeight: 20 }}>
            Ocurrió un error inesperado. Intenta de nuevo.
          </Text>
          <Pressable
            onPress={() => this.setState({ hasError: false })}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#10b981', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 }}
          >
            <Ionicons name="refresh" size={18} color="#ffffff" />
            <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 15 }}>Reintentar</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}
