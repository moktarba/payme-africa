import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, KeyboardAvoidingView,
  Platform, ScrollView
} from 'react-native';
import { Button, Input } from '../../components/ui';
import { Colors, Typography, Spacing, BorderRadius } from '../../utils/theme';
import { authApi } from '../../services/api';

const COUNTRY_CODE = '+221';

export default function PhoneScreen({ navigation }) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async () => {
    const cleaned = phone.replace(/\s/g, '');
    if (cleaned.length < 9) {
      setError('Entrez un numéro valide (ex: 77 123 45 67)');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const fullPhone = COUNTRY_CODE + cleaned;
      const res = await authApi.sendOtp(fullPhone);
      navigation.navigate('OTP', {
        phone: fullPhone,
        devCode: res.data.devCode || '',
      });
    } catch (err) {
      if (err.errorCode === 'MERCHANT_INTROUVABLE') {
        navigation.navigate('Register', { phone: COUNTRY_CODE + cleaned });
      } else {
        setError(err.userMessage || 'Erreur réseau. Réessayez.');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatPhone = (text) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 9);
    const parts = [];
    if (cleaned.length > 0) parts.push(cleaned.slice(0, 2));
    if (cleaned.length > 2) parts.push(cleaned.slice(2, 5));
    if (cleaned.length > 5) parts.push(cleaned.slice(5, 7));
    if (cleaned.length > 7) parts.push(cleaned.slice(7, 9));
    setPhone(parts.join(' '));
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.logoBox}>
              <Text style={styles.logoText}>💚</Text>
            </View>
            <Text style={styles.appName}>PayMe Africa</Text>
            <Text style={styles.tagline}>Encaissez simplement</Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.title}>Entrez votre numéro</Text>
            <Text style={styles.subtitle}>Nous vous enverrons un code de confirmation par SMS</Text>

            <View style={styles.phoneRow}>
              <View style={styles.countryCode}>
                <Text style={styles.flag}>🇸🇳</Text>
                <Text style={styles.code}>{COUNTRY_CODE}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  value={phone}
                  onChangeText={formatPhone}
                  placeholder="77 000 00 00"
                  keyboardType="phone-pad"
                  autoFocus
                  error={error}
                  style={{ marginBottom: 0 }}
                  inputStyle={{ fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightMedium }}
                />
              </View>
            </View>

            <Button title="Continuer" onPress={handleContinue} loading={loading} size="lg" style={styles.button} />
            <Text style={styles.disclaimer}>En continuant, vous acceptez nos conditions d'utilisation</Text>
          </View>

          <View style={styles.registerSection}>
            <Text style={styles.registerText}>Pas encore de compte ?</Text>
            <Button title="Créer un compte" variant="ghost" onPress={() => navigation.navigate('Register')} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  container: { flexGrow: 1, padding: Spacing.lg, justifyContent: 'space-between' },
  header: { alignItems: 'center', paddingTop: Spacing.xxl, paddingBottom: Spacing.xl },
  logoBox: { width: 80, height: 80, backgroundColor: Colors.primary, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md },
  logoText: { fontSize: 40 },
  appName: { fontSize: Typography.fontSize2XL, fontWeight: Typography.fontWeightExtrabold, color: Colors.primary },
  tagline: { fontSize: Typography.fontSizeMD, color: Colors.gray500, marginTop: 4 },
  form: { flex: 1, justifyContent: 'center', paddingVertical: Spacing.xl },
  title: { fontSize: Typography.fontSizeXL, fontWeight: Typography.fontWeightBold, color: Colors.gray900, marginBottom: Spacing.sm },
  subtitle: { fontSize: Typography.fontSizeMD, color: Colors.gray600, marginBottom: Spacing.xl, lineHeight: 22 },
  phoneRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.lg, gap: Spacing.sm },
  countryCode: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, height: 52 },
  flag: { fontSize: 20, marginRight: 4 },
  code: { fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightMedium, color: Colors.gray800 },
  button: { marginTop: Spacing.md },
  disclaimer: { fontSize: Typography.fontSizeSM, color: Colors.gray500, textAlign: 'center', marginTop: Spacing.md },
  registerSection: { alignItems: 'center', paddingBottom: Spacing.lg },
  registerText: { fontSize: Typography.fontSizeMD, color: Colors.gray600 },
});
