import { Platform, Vibration } from 'react-native';

/**
 * Vibration cross-platform
 * - Mobile : Vibration API native
 * - Web    : silencieux (pas de support navigateur)
 */
export const vibrate = (pattern = 50) => {
  if (Platform.OS === 'web') return;
  Vibration.vibrate(pattern);
};
