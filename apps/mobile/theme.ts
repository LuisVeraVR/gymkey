import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const scale = (size: number) => (SCREEN_WIDTH / 390) * size;

export const spacing = {
  xs: scale(4),
  sm: scale(8),
  md: scale(12),
  lg: scale(16),
  xl: scale(20),
  '2xl': scale(24),
  '3xl': scale(32),
  '4xl': scale(40),
  '5xl': scale(48),
} as const;

export const radius = {
  sm: scale(8),
  md: scale(12),
  lg: scale(16),
  xl: scale(20),
  '2xl': scale(24),
  full: 9999,
} as const;

export const fontSize = {
  xs: scale(11),
  sm: scale(13),
  base: scale(15),
  lg: scale(17),
  xl: scale(20),
  '2xl': scale(24),
  '3xl': scale(30),
  '4xl': scale(36),
} as const;

export const fontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export type ThemeMode = 'light' | 'dark';

export type ThemeBranding = {
  primaryColor?: string;
  accentColor?: string;
  appName?: string;
};

export type ColorPalette = {
  background: string;
  surface: string;
  surfaceElevated: string;
  surfacePressed: string;

  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  primary: string;
  primaryMuted: string;
  primaryPressed: string;
  primarySurface: string;

  border: string;
  borderStrong: string;
  separator: string;

  success: string;
  successSurface: string;
  warning: string;
  warningSurface: string;
  destructive: string;
  destructiveSurface: string;
  info: string;
  infoSurface: string;

  inputBackground: string;
  inputBorder: string;
  inputBorderFocused: string;
  placeholder: string;

  overlay: string;
  shimmer: string;

  tabBar: string;
  tabBarBorder: string;
  tabInactive: string;
  tabActive: string;

  shadowColor: string;
};

const light: ColorPalette = {
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceElevated: '#ffffff',
  surfacePressed: '#f1f5f9',

  text: '#0f172a',
  textSecondary: '#475569',
  textTertiary: '#94a3b8',
  textInverse: '#ffffff',

  primary: '#10b981',
  primaryMuted: '#d1fae5',
  primaryPressed: '#059669',
  primarySurface: '#ecfdf5',

  border: '#e2e8f0',
  borderStrong: '#cbd5e1',
  separator: '#f1f5f9',

  success: '#22c55e',
  successSurface: '#dcfce7',
  warning: '#f59e0b',
  warningSurface: '#fef3c7',
  destructive: '#ef4444',
  destructiveSurface: '#fee2e2',
  info: '#3b82f6',
  infoSurface: '#eff6ff',

  inputBackground: '#f8fafc',
  inputBorder: '#e2e8f0',
  inputBorderFocused: '#10b981',
  placeholder: '#94a3b8',

  overlay: 'rgba(15, 23, 42, 0.4)',
  shimmer: '#e2e8f0',

  tabBar: '#ffffff',
  tabBarBorder: '#f1f5f9',
  tabInactive: '#94a3b8',
  tabActive: '#10b981',

  shadowColor: '#0f172a',
};

const dark: ColorPalette = {
  background: '#030303',
  surface: '#0f0f11',
  surfaceElevated: '#18181b',
  surfacePressed: '#27272a',

  text: '#fafafa',
  textSecondary: '#a1a1aa',
  textTertiary: '#52525b',
  textInverse: '#0f172a',

  primary: '#10b981',
  primaryMuted: '#064e3b',
  primaryPressed: '#059669',
  primarySurface: '#052e16',

  border: '#1f1f22',
  borderStrong: '#27272a',
  separator: '#18181b',

  success: '#22c55e',
  successSurface: '#052e16',
  warning: '#f59e0b',
  warningSurface: '#451a03',
  destructive: '#ef4444',
  destructiveSurface: '#450a0a',
  info: '#3b82f6',
  infoSurface: '#172554',

  inputBackground: '#18181b',
  inputBorder: '#27272a',
  inputBorderFocused: '#10b981',
  placeholder: '#52525b',

  overlay: 'rgba(0, 0, 0, 0.6)',
  shimmer: '#27272a',

  tabBar: '#0f0f11',
  tabBarBorder: '#1f1f22',
  tabInactive: '#52525b',
  tabActive: '#10b981',

  shadowColor: '#000000',
};

export const themes = { light, dark } as const;

function withAlpha(hex: string, alpha: string) {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  return `#${clean}${alpha}`;
}

export function getColors(mode: ThemeMode, branding?: ThemeBranding | null): ColorPalette {
  const base = themes[mode];
  const primary = branding?.primaryColor?.trim();
  if (!primary) return base;
  return {
    ...base,
    primary,
    primaryPressed: branding?.accentColor?.trim() || primary,
    primarySurface: withAlpha(primary, mode === 'dark' ? '22' : '14'),
    primaryMuted: withAlpha(primary, mode === 'dark' ? '33' : '22'),
    tabActive: primary,
  };
}
