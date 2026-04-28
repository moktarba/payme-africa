import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import useStore from '../store/useStore';
import { Colors } from '../utils/theme';

// Screens
import PhoneScreen        from '../screens/auth/PhoneScreen';
import OtpScreen          from '../screens/auth/OtpScreen';
import RegisterScreen     from '../screens/auth/RegisterScreen';
import HomeScreen         from '../screens/main/HomeScreen';
import HistoryScreen      from '../screens/main/HistoryScreen';
import EncaissementScreen from '../screens/main/EncaissementScreen';
import ConfirmationScreen from '../screens/main/ConfirmationScreen';
import ProfileScreen      from '../screens/main/ProfileScreen';
import CatalogScreen      from '../screens/main/CatalogScreen';
import TransactionScreen  from '../screens/main/TransactionScreen';
import ReportsScreen      from '../screens/main/ReportsScreen';
import EmployeesScreen    from '../screens/main/EmployeesScreen';
import NotificationsScreen from '../screens/main/NotificationsScreen';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();
const Auth  = createStackNavigator();

// ── AUTH ──────────────────────────────────────────────────────────
function AuthNavigator() {
  return (
    <Auth.Navigator screenOptions={{ headerShown: false }}>
      <Auth.Screen name="Phone"    component={PhoneScreen} />
      <Auth.Screen name="OTP"      component={OtpScreen} />
      <Auth.Screen name="Register" component={RegisterScreen} />
    </Auth.Navigator>
  );
}

// ── TABS ──────────────────────────────────────────────────────────
function TabIcon({ icon, label, focused }) {
  return (
    <View style={{ alignItems: 'center', paddingTop: 6 }}>
      <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.35 }}>{icon}</Text>
      <Text style={{
        fontSize: 10, marginTop: 2,
        color: focused ? Colors.primary : Colors.gray400,
        fontWeight: focused ? '700' : '400',
      }}>{label}</Text>
    </View>
  );
}

function Tabs() {
  return (
    <Tab.Navigator screenOptions={{
      headerShown: false,
      tabBarStyle: {
        height: 68, paddingBottom: 10, paddingTop: 4,
        backgroundColor: Colors.white,
        borderTopWidth: 1, borderTopColor: Colors.border,
      },
      tabBarShowLabel: false,
    }}>
      <Tab.Screen name="home"    component={HomeScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon="🏠" label="Accueil"    focused={focused} /> }} />
      <Tab.Screen name="history" component={HistoryScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon="📋" label="Historique" focused={focused} /> }} />
      <Tab.Screen name="catalog" component={CatalogScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon="🗂️"  label="Catalogue"  focused={focused} /> }} />
      <Tab.Screen name="profile" component={ProfileScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon="👤" label="Profil"     focused={focused} /> }} />
    </Tab.Navigator>
  );
}

// ── APP ───────────────────────────────────────────────────────────
function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs"            component={Tabs} />
      <Stack.Screen name="encaissement"    component={EncaissementScreen}
        options={{ presentation: 'modal', gestureEnabled: true }} />
      <Stack.Screen name="confirmation"    component={ConfirmationScreen}
        options={{ presentation: 'modal', gestureEnabled: false }} />
      <Stack.Screen name="transactionDetail" component={TransactionScreen}
        options={{ presentation: 'card' }} />
      <Stack.Screen name="reports"          component={ReportsScreen}
        options={{ presentation: 'card' }} />
      <Stack.Screen name="employees"        component={EmployeesScreen}
        options={{ presentation: 'card' }} />
      <Stack.Screen name="notifications"    component={NotificationsScreen}
        options={{ presentation: 'card' }} />
    </Stack.Navigator>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────
export default function RootNavigator() {
  const { isAuthenticated, isLoading, restoreSession } = useStore();

  useEffect(() => { restoreSession(); }, []);

  if (isLoading) {
    return (
      <View style={s.splash}>
        <View style={s.box}>
          <Text style={s.emoji}>💚</Text>
        </View>
        <Text style={s.name}>PayMe Africa</Text>
        <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 20 }} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  splash: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.white },
  box:    { width: 88, height: 88, borderRadius: 22, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emoji:  { fontSize: 44 },
  name:   { fontSize: 26, fontWeight: '800', color: Colors.primary },
});
