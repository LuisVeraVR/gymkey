import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_KEY_CACHE = 'gymkey_access_key_cache_v1';

export type CachedAccessKeyPayload = {
  token: string;
  fetchedAt: string;
  subscription: string | null;
};

export async function saveCachedAccessKey(payload: CachedAccessKeyPayload) {
  const value = JSON.stringify(payload);
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ACCESS_KEY_CACHE, value);
    }
    return;
  }
  await SecureStore.setItemAsync(ACCESS_KEY_CACHE, value);
}

export async function getCachedAccessKey(): Promise<CachedAccessKeyPayload | null> {
  const raw =
    Platform.OS === 'web'
      ? typeof localStorage !== 'undefined'
        ? localStorage.getItem(ACCESS_KEY_CACHE)
        : null
      : await SecureStore.getItemAsync(ACCESS_KEY_CACHE);

  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CachedAccessKeyPayload;
    if (!parsed?.token || !parsed?.fetchedAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function clearCachedAccessKey() {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(ACCESS_KEY_CACHE);
    }
    return;
  }
  await SecureStore.deleteItemAsync(ACCESS_KEY_CACHE);
}
