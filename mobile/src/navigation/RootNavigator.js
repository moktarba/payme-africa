import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import useStore from '../store/useStore';
import { Colors, Typography, Spacing } from '../utils/theme';

import PhoneScreen      from '../screens/auth/PhoneScreen';
import OtpScreen        from '../screens/auth/OtpScreen';
import RegisterScreen   from '../screens/auth/RegisterScreen';
import HomeScreen       from '../screens/main/HomeScreen';
import HistoryScreen    from '../screens/main/HistoryScreen';
import EncaissementScreen  from '../screens/main/EncaissementScreen';
import ConfirmationScreen  from '../screens/main/ConfirmationScreen';
import ProfileScreen    from '../screens/main/ProfileScreen';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();
const Auth  = createStackNavigator();

/* ---- AUTH ---- */
function AuthNavigator() {
  return (
    <Auth.Navigator screenOptions={{ headerShown: false }}>
      <Auth.Screen name="Phone"    component={PhoneScreen} />
      <Auth.Screen name="OTP"      component={OtpScreen} />
      <Auth.Screen name="Register" component={RegisterScreen} />
    </Auth.Navigator>
  );
}

/* ---- TABS ---- */
function TabIcon({ icon, label, focused }) {
  return (
    <View style={t.wrap}>
      <Text style={[t.icon, focused && t.iconOn]}>{icon}</Text>
      <Text style={[t.label, focused && t.labelOn]}>{label}</Text>
    </View>
  );
}

function Tabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarStyle: t.bar, tabBarShowLabel: false }}>
      <Tab.Screen name="home"    component={HomeScreen}    options={{ tabBarIcon: ({ focused }) => <TabIcon icon="🏠" label="Accueil"     focused={focused} /> }} />
      <Tab.Screen name="history" component={HistoryScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon icon="📋" label="Historique"  focused={focused} /> }} />
      <Tab.Screen name="profile" component={ProfileScreen} options={{ tabBarIcon: ({ focused }) => <TabIcon icon="👤" label="Profil"      focused={focused} /> }} />
    </Tab.Navigator>
  );
}

/* ---- APP (tabs + modals) ---- */
function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs"           component={Tabs} />
      <Stack.Screen name="encaissement"   component={EncaissementScreen}  options={{ presentation: 'modal' }} />
      <Stack.Screen name="confirmation"   component={ConfirmationScreen}  options={{ presentation: 'modal' }} />
    </Stack.Navigator>
  );
}

/* ---- ROOT ---- */
export default function RootNavigator() {
  const { isAuthenticated, isLoading, restoreSession } = useStore();

  useEffect(() => { restoreSession(); }, []);

  if (isLoading) {
    return (
      <View style={s.splash}>
        <Text style={s.splashLogo}>💚</Text>
        <Text style={s.splashName}>PayMe Africa</Text>
        <ActivityIndicator color={Colors.primary} style={{ marginTop: Spacing.lg }} />
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

const t = StyleSheet.create({
  bar:     { backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border, height: 70, paddingBottom: 10 },
  wrap:    { alignItems: 'center', justifyContent: 'center', paddingTop: 8 },
  icon:    { fontSize: 24, opacity: 0.45 },
  iconOn:  { opacity: 1 },
  label:   { fontSize: 11, color: Colors.gray500, marginTop: 2 },
  labelOn: { color: Colors.primary, fontWeight: Typography.fontWeightSemibold },
});

const s = StyleSheet.create({
  splash:     { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.white },
  splashLogo: { fontSize: 64 },
  splashName: { fontSize: Typography.fontSizeXL, fontWeight: Typography.fontWeightBold, color: Colors.primary, marginTop: Spacing.sm },
});
