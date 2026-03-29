import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import {
  clearStoredAccessToken,
  getStoredAccessToken,
} from './tokenStorage';

const envUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');

/** Debe coincidir con `PORT` en apps/api (.env). Ej.: 3333 si la API arranca con PORT=3333. */
const apiPortRaw =
  process.env.EXPO_PUBLIC_API_PORT?.replace(/[^\d]/g, '').trim() ?? '';
const apiPort = apiPortRaw || '3001';

function hostFromBundlerUri(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  const noProto = s.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, '');
  const host = noProto.split(':')[0]?.trim();
  if (!host || host === 'localhost' || host === '127.0.0.1') return null;
  return host;
}

/**
 * En Expo Go / dev, `expoConfig.hostUri` es la IP/puerto del bundler (p. ej. 192.168.x.x:8081).
 * Usar esa IP para la API evita que un dispositivo físico llame a localhost (el propio teléfono).
 */
function defaultApiBaseUrl(): string {
  if (Platform.OS === 'web') {
    return `http://localhost:${apiPort}/api`;
  }
  if (__DEV__) {
    const hostUri =
      Constants.expoConfig?.hostUri ??
      (Constants.expoGoConfig as { debuggerHost?: string } | null)?.debuggerHost;
    if (hostUri) {
      const host = hostFromBundlerUri(hostUri);
      if (host) {
        return `http://${host}:${apiPort}/api`;
      }
    }
  }
  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${apiPort}/api`;
  }
  return `http://localhost:${apiPort}/api`;
}

export const API_BASE_URL = envUrl || defaultApiBaseUrl();

let onSessionExpired: (() => void) | null = null;

export function setSessionExpiredHandler(fn: (() => void) | null) {
  onSessionExpired = fn;
}

/** Peticiones sin Bearer automático (login, MFA con tempToken). */
export const authClient = axios.create({
  baseURL: API_BASE_URL,
});

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use(async (config) => {
  const token = await getStoredAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const status = err.response?.status;
    if (status === 401) {
      await clearStoredAccessToken();
      onSessionExpired?.();
    }
    return Promise.reject(err);
  },
);

export default api;
