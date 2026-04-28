/**
 * Storage cross-platform
 * Native : expo-secure-store (chiffré)
 * Web    : localStorage
 * 
 * Import statique pour éviter les blocages Metro/Hermes
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export const storage = {
  async get(key) {
    try {
      if (Platform.OS === 'web') {
        return window.localStorage.getItem(key);
      }
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },

  async set(key, value) {
    try {
      if (Platform.OS === 'web') {
        window.localStorage.setItem(key, String(value));
      } else {
        await SecureStore.setItemAsync(key, String(value));
      }
    } catch {}
  },

  async delete(key) {
    try {
      if (Platform.OS === 'web') {
        window.localStorage.removeItem(key);
      } else {
        await SecureStore.deleteItemAsync(key);
      }
    } catch {}
  },
};
