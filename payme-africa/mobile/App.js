import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, AppState } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RootNavigator from './src/navigation/RootNavigator';
import {
  configurePushNotifications,
  registerForPushNotifications,
  sendTokenToServer,
  addNotificationResponseListener,
} from './src/services/pushNotifications';
import api from './src/services/api';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 60_000 },
  },
});

export default function App() {
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    // Configurer les notifications
    configurePushNotifications();

    // Enregistrer le token push (silencieux si erreur)
    registerForPushNotifications()
      .then(token => { if (token) sendTokenToServer(token, api); })
      .catch(() => {});

    // Écouter les taps sur notifications (app en background)
    const unsub = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data;
      // Navigation selon le type de notification
      if (data?.transactionId) {
        // Ouvrir le détail de la transaction
        // (géré par RootNavigator via navigationRef)
      }
    });

    return unsub;
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <RootNavigator />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
