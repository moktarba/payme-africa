import { Platform } from 'react-native';

/**
 * Service Push Notifications — Expo Notifications
 * 
 * Wrappé pour éviter les crashs si expo-notifications n'est pas installé
 * Installation : npx expo install expo-notifications expo-device
 */

let Notifications = null;
let Device = null;

try {
  Notifications = require('expo-notifications');
  Device = require('expo-device');
} catch {
  // expo-notifications non installé — mode dégradé
}

/**
 * Configure le handler de notifications (affichage en foreground)
 */
export function configurePushNotifications() {
  if (!Notifications) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge:  true,
    }),
  });
}

/**
 * Demande la permission et retourne le token Expo Push
 */
export async function registerForPushNotifications() {
  if (!Notifications || !Device) return null;

  // Push uniquement sur appareil physique
  if (!Device.isDevice) {
    console.log('[PUSH] Simulateur détecté — push désactivé');
    return null;
  }

  // Vérifier / demander la permission
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[PUSH] Permission refusée');
    return null;
  }

  // Sur Android : créer le canal
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('payme', {
      name:       'PayMe Africa',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1B4332',
    });
  }

  // Obtenir le token Expo
  const { data: token } = await Notifications.getExpoPushTokenAsync({
    projectId: 'payme-africa', // Votre ID projet Expo
  });

  console.log('[PUSH] Token obtenu:', token?.slice(0, 30) + '...');
  return token;
}

/**
 * Envoyer le token au backend pour l'enregistrer
 */
export async function sendTokenToServer(token, api) {
  if (!token) return;
  try {
    await api.put('/merchants/me', { pushToken: token });
    console.log('[PUSH] Token enregistré sur le serveur');
  } catch (err) {
    console.warn('[PUSH] Erreur enregistrement token:', err.message);
  }
}

/**
 * Écouter les notifications reçues
 */
export function addNotificationListener(callback) {
  if (!Notifications) return () => {};
  const sub = Notifications.addNotificationReceivedListener(callback);
  return () => sub.remove();
}

/**
 * Écouter les taps sur notification (depuis background)
 */
export function addNotificationResponseListener(callback) {
  if (!Notifications) return () => {};
  const sub = Notifications.addNotificationResponseReceivedListener(callback);
  return () => sub.remove();
}
