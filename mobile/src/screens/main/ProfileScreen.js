import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, Switch
} from 'react-native';
import { Button, Card } from '../../components/ui';
import { Colors, Typography, Spacing, BorderRadius, PROVIDER_LABELS, PROVIDER_COLORS } from '../../utils/theme';
import { merchantApi, authApi } from '../../services/api';
import { storage } from '../../utils/storage';
import useStore from '../../store/useStore';

const PROVIDER_ICONS = { wave: '🌊', orange_money: '🟠', free_money: '🔴', cash: '💵' };

export default function ProfileScreen({ navigation }) {
  const { merchant, logout } = useStore();
  const [paymentMethods, setPaymentMethods] = useState([]);

  useEffect(() => {
    merchantApi.getPaymentMethods()
      .then((res) => setPaymentMethods(res.data.paymentMethods))
      .catch(() => {});
  }, []);

  const toggleProvider = async (provider, current) => {
    const updated = paymentMethods.map((pm) =>
      pm.provider === provider ? { ...pm, is_enabled: !current } : pm
    );
    setPaymentMethods(updated);
    try {
      await merchantApi.updatePaymentMethod(provider, { isEnabled: !current });
    } catch {
      setPaymentMethods(paymentMethods);
      Alert.alert('Erreur', 'Impossible de modifier ce mode de paiement.');
    }
  };

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnecter', style: 'destructive',
        onPress: async () => {
          const refreshToken = await storage.get('refreshToken');
          if (refreshToken) await authApi.logout(refreshToken).catch(() => {});
          await logout();
        }
      }
    ]);
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={s.title}>Profil</Text>

        <Card style={s.merchantCard}>
          <View style={s.avatarRow}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{merchant?.businessName?.[0]?.toUpperCase() || 'M'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.businessName}>{merchant?.businessName}</Text>
              {merchant?.ownerName ? <Text style={s.ownerName}>{merchant.ownerName}</Text> : null}
              <Text style={s.phone}>{merchant?.phone}</Text>
              {merchant?.city ? <Text style={s.city}>📍 {merchant.city}</Text> : null}
            </View>
          </View>
        </Card>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Moyens de paiement</Text>
          <Card>
            {paymentMethods.map((pm, i) => (
              <View key={pm.provider}>
                <View style={s.pmRow}>
                  <View style={[s.pmIcon, { backgroundColor: (PROVIDER_COLORS[pm.provider] || Colors.gray400) + '20' }]}>
                    <Text style={s.pmIconText}>{PROVIDER_ICONS[pm.provider] || '💳'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.pmName}>{pm.display_name || PROVIDER_LABELS[pm.provider]}</Text>
                    <Text style={s.pmStatus}>{pm.is_enabled ? 'Activé' : 'Désactivé'}</Text>
                  </View>
                  <Switch
                    value={pm.is_enabled}
                    onValueChange={() => toggleProvider(pm.provider, pm.is_enabled)}
                    trackColor={{ false: Colors.gray300, true: Colors.primary }}
                    thumbColor={Colors.white}
                  />
                </View>
                {i < paymentMethods.length - 1 && <View style={s.divider} />}
              </View>
            ))}
          </Card>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>À propos</Text>
          <Card>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Version</Text>
              <Text style={s.infoValue}>1.0.0 — Sprint 0</Text>
            </View>
            <View style={s.divider} />
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Devise</Text>
              <Text style={s.infoValue}>{merchant?.currency || 'XOF'} — Franc CFA</Text>
            </View>
          </Card>
        </View>

        <View style={s.section}>
          <Button title="Se déconnecter" variant="danger" onPress={handleLogout} size="lg" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  title: { fontSize: Typography.fontSize2XL, fontWeight: Typography.fontWeightExtrabold, color: Colors.gray900, padding: Spacing.lg, paddingBottom: Spacing.md },
  merchantCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  avatarRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  avatarText: { color: Colors.white, fontSize: Typography.fontSizeXL, fontWeight: Typography.fontWeightBold },
  businessName: { fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold, color: Colors.gray900 },
  ownerName: { fontSize: Typography.fontSizeMD, color: Colors.gray600, marginTop: 2 },
  phone: { fontSize: Typography.fontSizeSM, color: Colors.gray500, marginTop: 2 },
  city: { fontSize: Typography.fontSizeSM, color: Colors.gray500, marginTop: 2 },
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  sectionTitle: { fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightBold, color: Colors.gray500, marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  pmRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm },
  pmIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  pmIconText: { fontSize: 22 },
  pmName: { fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightSemibold, color: Colors.gray900 },
  pmStatus: { fontSize: Typography.fontSizeSM, color: Colors.gray500, marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 4 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  infoLabel: { fontSize: Typography.fontSizeMD, color: Colors.gray600 },
  infoValue: { fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightMedium, color: Colors.gray900 },
});
