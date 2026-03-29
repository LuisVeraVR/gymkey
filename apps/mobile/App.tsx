import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginFlow } from './components/LoginFlow';
import { MainApp } from './components/MainApp';

function Root() {
  const { token, signIn } = useAuth();
  return token ? <MainApp /> : <LoginFlow onLogin={signIn} />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Root />
        <StatusBar style="auto" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
