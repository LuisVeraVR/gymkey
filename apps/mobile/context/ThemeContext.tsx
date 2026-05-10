import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { type ColorPalette, type ThemeBranding, type ThemeMode, getColors } from '../theme';

type ThemePreference = 'system' | 'light' | 'dark';

type ThemeContextValue = {
  colors: ColorPalette;
  mode: ThemeMode;
  isDark: boolean;
  preference: ThemePreference;
  toggleMode: () => void;
  setMode: (pref: ThemePreference) => void;
  branding: ThemeBranding | null;
  setBranding: (branding: ThemeBranding | null) => void;
};

const THEME_KEY = 'theme_preference';

const ThemeContext = createContext<ThemeContextValue | null>(null);

async function loadPreference(): Promise<ThemePreference> {
  try {
    if (Platform.OS === 'web') {
      const val =
        typeof localStorage !== 'undefined'
          ? localStorage.getItem(THEME_KEY)
          : null;
      if (val === 'light' || val === 'dark' || val === 'system') return val;
      return 'system';
    }
    const val = await SecureStore.getItemAsync(THEME_KEY);
    if (val === 'light' || val === 'dark' || val === 'system') return val;
  } catch {}
  return 'system';
}

async function savePreference(pref: ThemePreference) {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined')
        localStorage.setItem(THEME_KEY, pref);
      return;
    }
    await SecureStore.setItemAsync(THEME_KEY, pref);
  } catch {}
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreference] = useState<ThemePreference>('system');
  const [branding, setBranding] = useState<ThemeBranding | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadPreference().then((p) => {
      setPreference(p);
      setReady(true);
    });
  }, []);

  const resolvedMode: ThemeMode = useMemo(() => {
    if (preference === 'system') return systemScheme === 'dark' ? 'dark' : 'light';
    return preference;
  }, [preference, systemScheme]);

  const colors = useMemo(
    () => getColors(resolvedMode, branding),
    [resolvedMode, branding],
  );
  const isDark = resolvedMode === 'dark';

  const setMode = useCallback((pref: ThemePreference) => {
    setPreference(pref);
    savePreference(pref);
  }, []);

  const toggleMode = useCallback(() => {
    const next: ThemePreference = resolvedMode === 'light' ? 'dark' : 'light';
    setMode(next);
  }, [resolvedMode, setMode]);

  const value = useMemo(
    () => ({
      colors,
      mode: resolvedMode,
      isDark,
      preference,
      toggleMode,
      setMode,
      branding,
      setBranding,
    }),
    [colors, resolvedMode, isDark, preference, toggleMode, setMode, branding],
  );

  if (!ready) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de ThemeProvider');
  return ctx;
}
