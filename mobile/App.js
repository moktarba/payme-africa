// IMPORTANT: react-native-gesture-handler DOIT être le 1er import
import 'react-native-gesture-handler';

import React, { Component } from 'react';
import { View, Text } from 'react-native';
import { registerRootComponent } from 'expo';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RootNavigator from './src/navigation/RootNavigator';

// ErrorBoundary : affiche l'erreur au lieu d'un écran blanc
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#fff' }}>
          <Text style={{ color: '#E53E3E', fontSize: 16, marginBottom: 8, textAlign: 'center' }}>
            Erreur au démarrage
          </Text>
          <Text style={{ color: '#4A5568', fontSize: 12, textAlign: 'center' }}>
            {String(this.state.error)}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 60000 } },
});

function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <RootNavigator />
        </QueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

registerRootComponent(App);
