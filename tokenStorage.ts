import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'accessToken';

/**
 * SecureStore no está implementado en web (módulo nativo vacío): falla setItemAsync.
 * En web usamos localStorage para poder iniciar sesión en el navegador.
 */
export async function getStoredAccessToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return typeof localStorage !== 'undefined'
        ? localStorage.getItem(ACCESS_TOKEN_KEY)
        : null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function setStoredAccessToken(value: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ACCESS_TOKEN_KEY, value);
    }
    return;
  }
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, value);
}

export async function clearStoredAccessToken(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
    return;
  }
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
}
