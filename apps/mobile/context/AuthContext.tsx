import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { setSessionExpiredHandler } from '../api';
import {
  clearStoredAccessToken,
  getStoredAccessToken,
  setStoredAccessToken,
} from '../tokenStorage';
import { theme } from '../theme';

type AuthContextValue = {
  token: string | null;
  signIn: (accessToken: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const signIn = useCallback(async (accessToken: string) => {
    await setStoredAccessToken(accessToken);
    setToken(accessToken);
  }, []);

  const signOut = useCallback(async () => {
    await clearStoredAccessToken();
    setToken(null);
  }, []);

  useEffect(() => {
    (async () => {
      const saved = await getStoredAccessToken();
      setToken(saved);
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      setToken(null);
    });
    return () => setSessionExpiredHandler(null);
  }, []);

  const value = useMemo(
    () => ({ token, signIn, signOut }),
    [token, signIn, signOut],
  );

  if (!ready) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return ctx;
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.surface,
  },
});
