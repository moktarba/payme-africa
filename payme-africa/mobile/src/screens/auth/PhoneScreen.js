import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  TextInput, TouchableOpacity, ActivityIndicator, ScrollView
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius } from '../../utils/theme';
import { authApi } from '../../services/api';

export default function PhoneScreen({ navigation }) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async () => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 9) { setError('Entrez un numéro valide (9 chiffres)'); return; }
    setError('');
    setLoading(true);
    try {
      const fullPhone = '+221' + cleaned;
      const res = await authApi.sendOtp(fullPhone);
      navigation.navigate('OTP', { phone: fullPhone, devCode: res.data.devCode || '' });
    } catch (err) {
      if (err.errorCode === 'MERCHANT_INTROUVABLE') {
        navigation.navigate('Register', { phone: '+221' + cleaned });
      } else {
        setError(err.userMessage || 'Erreur réseau. Vérifiez votre connexion.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* Logo */}
        <View style={s.logoWrap}>
          <View style={s.logoBox}>
            <Text style={s.logoEmoji}>💚</Text>
          </View>
          <Text style={s.appName}>PayMe Africa</Text>
          <Text style={s.tagline}>Encaissez simplement</Text>
        </View>

        {/* Formulaire */}
        <View style={s.form}>
          <Text style={s.label}>Votre numéro de téléphone</Text>

          <View style={s.phoneRow}>
            <View style={s.prefix}>
              <Text style={s.prefixText}>🇸🇳 +221</Text>
            </View>
            <TextInput
              style={s.input}
              value={phone}
              onChangeText={(t) => { setPhone(t.replace(/\D/g, '').slice(0, 9)); setError(''); }}
              placeholder="77 000 00 00"
              placeholderTextColor={Colors.gray400}
              keyboardType="phone-pad"
              autoFocus
              maxLength={9}
            />
          </View>

          {error ? <Text style={s.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[s.btn, (loading || phone.length < 9) && s.btnDisabled]}
            onPress={handleContinue}
            disabled={loading || phone.length < 9}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color={Colors.white} />
              : <Text style={s.btnText}>Continuer →</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Inscription */}
        <View style={s.footer}>
          <Text style={s.footerText}>Pas encore de compte ?</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={s.footerLink}>Créer un compte</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  scroll: { flexGrow: 1, padding: Spacing.lg },

  logoWrap: { alignItems: 'center', paddingVertical: 40 },
  logoBox: { width: 80, height: 80, borderRadius: 20, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  logoEmoji: { fontSize: 40 },
  appName: { fontSize: 28, fontWeight: '800', color: Colors.primary },
  tagline: { fontSize: 16, color: Colors.gray500, marginTop: 4 },

  form: { marginBottom: 32 },
  label: { fontSize: 16, fontWeight: '600', color: Colors.gray800, marginBottom: 10 },
  phoneRow: { flexDirection: 'row', borderWidth: 2, borderColor: Colors.border, borderRadius: 12, overflow: 'hidden', marginBottom: 8 },
  prefix: { backgroundColor: Colors.gray100, paddingHorizontal: 14, justifyContent: 'center', borderRightWidth: 1, borderRightColor: Colors.border },
  prefixText: { fontSize: 16, fontWeight: '600', color: Colors.gray800 },
  input: { flex: 1, fontSize: 18, fontWeight: '600', color: Colors.gray900, padding: 14 },
  error: { fontSize: 14, color: Colors.error, marginBottom: 8 },

  btn: { backgroundColor: Colors.primary, borderRadius: 14, height: 56, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.45 },
  btnText: { fontSize: 18, fontWeight: '700', color: Colors.white },

  footer: { alignItems: 'center', gap: 8 },
  footerText: { fontSize: 15, color: Colors.gray600 },
  footerLink: { fontSize: 16, fontWeight: '700', color: Colors.primary },
});
