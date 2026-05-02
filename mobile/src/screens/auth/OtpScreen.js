import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  TextInput
} from 'react-native';

import { Button } from '../../components/ui';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../utils/theme';
import { authApi } from '../../services/api';
import useStore from '../../store/useStore';

const CODE_LENGTH = 6;

export default function OtpScreen({ navigation, route }) {
  const { phone, devCode } = route?.params || {};
  const setAuth = useStore((s) => s.setAuth);

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(30);
  const inputRef = useRef(null);

  useEffect(() => {
    if (devCode) {
      setCode(String(devCode));
    }
  }, [devCode]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = setTimeout(() => setResendTimer((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendTimer]);

  const handleVerify = async () => {
    if (code.length !== CODE_LENGTH) {
      setError('Entrez le code à 6 chiffres');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await authApi.verifyOtp(phone, code);
      const { accessToken, refreshToken, merchant } = res.data;
      await setAuth({ accessToken, refreshToken, merchant });
      navigation.replace('Tabs');
    } catch (err) {
      if (err.errorCode === 'MERCHANT_INTROUVABLE') {
        navigation.replace('Register', { phone });
      } else {
        setError(err.userMessage || 'Code incorrect. Réessayez.');
        setCode('');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      const res = await authApi.sendOtp(phone);
      if (res.data.devCode) setCode(String(res.data.devCode));
      setResendTimer(30);
      setError('');
    } catch (err) {
      setError(err.userMessage || 'Impossible de renvoyer. Réessayez.');
    }
  };

  const displayPhone = phone?.replace(/(\+221)(\d{2})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.icon}>📱</Text>
          <Text style={styles.title}>Code de vérification</Text>
          <Text style={styles.subtitle}>
            Code envoyé par SMS au{'\n'}
            <Text style={styles.phone}>{displayPhone}</Text>
          </Text>
          {devCode ? (
            <View style={styles.devBanner}>
              <Text style={styles.devText}>⚙️ DEV : code pré-rempli {devCode}</Text>
            </View>
          ) : null}
        </View>

        {/* Input caché + cases visuelles */}
        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={(t) => {
            const cleaned = t.replace(/\D/g, '').slice(0, CODE_LENGTH);
            setCode(cleaned);
            setError('');
            if (cleaned.length === CODE_LENGTH) {
              setTimeout(() => handleVerify(), 200);
            }
          }}
          keyboardType="number-pad"
          maxLength={CODE_LENGTH}
          style={styles.hiddenInput}
          autoFocus
        />

        <TouchableOpacity
          style={styles.boxes}
          onPress={() => inputRef.current?.focus()}
          activeOpacity={1}
        >
          {Array.from({ length: CODE_LENGTH }).map((_, i) => {
            const char = code[i] || '';
            const isCurrent = i === code.length;
            return (
              <View
                key={i}
                style={[styles.box, isCurrent && styles.boxActive, char && styles.boxFilled]}
              >
                <Text style={styles.boxText}>{char}</Text>
              </View>
            );
          })}
        </TouchableOpacity>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          title="Vérifier"
          onPress={handleVerify}
          loading={loading}
          size="lg"
          disabled={code.length !== CODE_LENGTH}
          style={styles.button}
        />

        <View style={styles.resendRow}>
          {resendTimer > 0 ? (
            <Text style={styles.resendWait}>Renvoyer dans {resendTimer}s</Text>
          ) : (
            <TouchableOpacity onPress={handleResend}>
              <Text style={styles.resendLink}>Renvoyer le code</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, padding: Spacing.lg },
  back: { paddingVertical: Spacing.sm, marginBottom: Spacing.md },
  backText: { fontSize: Typography.fontSizeMD, color: Colors.primary, fontWeight: Typography.fontWeightMedium },
  header: { alignItems: 'center', marginBottom: Spacing.xl },
  icon: { fontSize: 56, marginBottom: Spacing.md },
  title: { fontSize: Typography.fontSize2XL, fontWeight: Typography.fontWeightBold, color: Colors.gray900, marginBottom: Spacing.sm },
  subtitle: { fontSize: Typography.fontSizeMD, color: Colors.gray600, textAlign: 'center', lineHeight: 24 },
  phone: { fontWeight: Typography.fontWeightBold, color: Colors.gray900 },
  devBanner: { marginTop: Spacing.md, backgroundColor: Colors.warningBg, borderRadius: BorderRadius.sm, padding: Spacing.sm },
  devText: { fontSize: Typography.fontSizeSM, color: '#856404', fontWeight: Typography.fontWeightMedium },
  hiddenInput: { position: 'absolute', opacity: 0, height: 0, width: 0 },
  boxes: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm, marginBottom: Spacing.lg },
  box: {
    width: 50, height: 60, borderWidth: 2, borderColor: Colors.border,
    borderRadius: BorderRadius.md, backgroundColor: Colors.white,
    justifyContent: 'center', alignItems: 'center', ...Shadows.sm,
  },
  boxActive: { borderColor: Colors.primary, borderWidth: 2.5 },
  boxFilled: { backgroundColor: Colors.primaryBg, borderColor: Colors.primary },
  boxText: { fontSize: Typography.fontSize2XL, fontWeight: Typography.fontWeightBold, color: Colors.gray900 },
  error: { fontSize: Typography.fontSizeMD, color: Colors.error, textAlign: 'center', marginBottom: Spacing.md },
  button: { marginTop: Spacing.sm },
  resendRow: { alignItems: 'center', marginTop: Spacing.lg },
  resendWait: { fontSize: Typography.fontSizeMD, color: Colors.gray500 },
  resendLink: { fontSize: Typography.fontSizeMD, color: Colors.primary, fontWeight: Typography.fontWeightSemibold, textDecorationLine: 'underline' },
});
