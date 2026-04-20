import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const REFRESH_TOKEN_KEY = '@hera_refresh_token';

const isNativeSecureStoreAvailable = Platform.OS === 'ios' || Platform.OS === 'android';
const isWebPlatform = Platform.OS === 'web';

const setPersistentValue = async (key: string, value: string): Promise<void> => {
  if (isWebPlatform) {
    await AsyncStorage.removeItem(key);
    return;
  }

  if (isNativeSecureStoreAvailable) {
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    return;
  }

  await AsyncStorage.setItem(key, value);
};

const getPersistentValue = async (key: string): Promise<string | null> => {
  if (isWebPlatform) {
    await AsyncStorage.removeItem(key);
    return null;
  }

  if (isNativeSecureStoreAvailable) {
    return SecureStore.getItemAsync(key);
  }

  return AsyncStorage.getItem(key);
};

const removePersistentValue = async (key: string): Promise<void> => {
  if (isWebPlatform) {
    await AsyncStorage.removeItem(key);
    return;
  }

  if (isNativeSecureStoreAvailable) {
    await SecureStore.deleteItemAsync(key);
    return;
  }

  await AsyncStorage.removeItem(key);
};

export const persistRefreshToken = async (refreshToken: string): Promise<void> =>
  setPersistentValue(REFRESH_TOKEN_KEY, refreshToken);

export const getPersistedRefreshToken = async (): Promise<string | null> =>
  getPersistentValue(REFRESH_TOKEN_KEY);

export const clearPersistedRefreshToken = async (): Promise<void> =>
  removePersistentValue(REFRESH_TOKEN_KEY);

export const clearPersistedClinicalAccessSession = async (): Promise<void> =>
  Promise.resolve();
