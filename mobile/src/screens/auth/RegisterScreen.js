import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  KeyboardAvoidingView, Platform, TouchableOpacity
} from 'react-native';
import { Button, Input } from '../../components/ui';
import { Colors, Typography, Spacing, BorderRadius, ACTIVITY_TYPES } from '../../utils/theme';
import { authApi } from '../../services/api';

export default function RegisterScreen({ navigation, route }) {
  const initialPhone = route?.params?.phone?.replace('+221', '') || '';
  const [phone, setPhone] = useState(initialPhone);
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [city, setCity] = useState('');
  const [activityType, setActivityType] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!phone || phone.replace(/\s/g, '').length < 9) newErrors.phone = 'Numéro invalide';
    if (!businessName.trim()) newErrors.businessName = 'Nom du commerce requis';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const fullPhone = '+221' + phone.replace(/\s/g, '');
      const res = await authApi.register({
        phone: fullPhone,
        businessName: businessName.trim(),
        ownerName: ownerName.trim() || undefined,
        city: city.trim() || undefined,
        activityType: activityType || undefined,
      });
      navigation.navigate('OTP', { phone: fullPhone, devCode: res.data.devCode || '' });
    } catch (err) {
      if (err.errorCode === 'PHONE_EXISTE') {
        setErrors({ phone: 'Ce numéro est déjà utilisé. Connectez-vous.' });
      } else {
        setErrors({ global: err.userMessage || 'Erreur. Réessayez.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Créer votre compte</Text>
          <Text style={styles.subtitle}>Quelques informations pour démarrer</Text>

          {errors.global && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{errors.global}</Text>
            </View>
          )}

          <View style={styles.phoneRow}>
            <View style={styles.countryCode}>
              <Text style={styles.flag}>🇸🇳</Text>
              <Text style={styles.code}>+221</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Input
                value={phone}
                onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 9))}
                placeholder="77 000 00 00"
                keyboardType="phone-pad"
                error={errors.phone}
                style={{ marginBottom: 0 }}
              />
            </View>
          </View>

          <Input label="Nom de votre commerce *" value={businessName} onChangeText={setBusinessName} placeholder="Ex: Boutique Aminata..." error={errors.businessName} />
          <Input label="Votre nom (facultatif)" value={ownerName} onChangeText={setOwnerName} placeholder="Ex: Aminata Diallo" />
          <Input label="Ville (facultatif)" value={city} onChangeText={setCity} placeholder="Ex: Dakar, Thiès..." />

          <Text style={styles.activityLabel}>Type d'activité (facultatif)</Text>
          <View style={styles.activityGrid}>
            {ACTIVITY_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[styles.activityChip, activityType === type.value && styles.activityChipActive]}
                onPress={() => setActivityType(activityType === type.value ? '' : type.value)}
              >
                <Text style={[styles.activityChipText, activityType === type.value && styles.activityChipTextActive]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Button title="Créer mon compte" onPress={handleRegister} loading={loading} size="lg" style={styles.button} />
          <Text style={styles.disclaimer}>En créant un compte, vous acceptez nos conditions d'utilisation.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  container: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  back: { paddingVertical: Spacing.sm, marginBottom: Spacing.md },
  backText: { fontSize: Typography.fontSizeMD, color: Colors.primary, fontWeight: Typography.fontWeightMedium },
  title: { fontSize: Typography.fontSize2XL, fontWeight: Typography.fontWeightBold, color: Colors.gray900, marginBottom: Spacing.sm },
  subtitle: { fontSize: Typography.fontSizeMD, color: Colors.gray600, marginBottom: Spacing.xl },
  errorBanner: { backgroundColor: Colors.errorBg, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md },
  errorBannerText: { color: Colors.error, fontSize: Typography.fontSizeMD },
  phoneRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.md, gap: Spacing.sm },
  countryCode: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, height: 52 },
  flag: { fontSize: 18, marginRight: 4 },
  code: { fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightMedium, color: Colors.gray800 },
  activityLabel: { fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightMedium, color: Colors.gray800, marginBottom: Spacing.sm },
  activityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.xl },
  activityChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white },
  activityChipActive: { backgroundColor: Colors.primaryBg, borderColor: Colors.primary },
  activityChipText: { fontSize: Typography.fontSizeMD, color: Colors.gray700 },
  activityChipTextActive: { color: Colors.primary, fontWeight: Typography.fontWeightSemibold },
  button: { marginBottom: Spacing.lg },
  disclaimer: { fontSize: Typography.fontSizeSM, color: Colors.gray500, textAlign: 'center', lineHeight: 20 },
});
