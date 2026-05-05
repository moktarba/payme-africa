import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, Share
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, withDelay,
} from 'react-native-reanimated';
import { vibrate } from '../../utils/haptics';
import { Button } from '../../components/ui';
import {
  Colors, Typography, Spacing, BorderRadius, Shadows,
  formatAmount, PROVIDER_LABELS
} from '../../utils/theme';
import { transactionApi } from '../../services/api';
import dayjs from 'dayjs';

const PROVIDER_ICONS = { wave: '🌊', orange_money: '🟠', free_money: '🔴', cash: '💵' };

export default function ConfirmationScreen({ navigation, route }) {
  const { transactionId, amount, provider, instructions } = route?.params || {};
  const [loading, setLoading]       = useState(false);
  const [confirmed, setConfirmed]   = useState(false);
  const [confirmedAt, setConfirmedAt] = useState(null);

  const amountNum = parseInt(amount || '0');

  // ── Reanimated ────────────────────────────────────────────────────
  const circleScale    = useSharedValue(0);
  const checkScale     = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const contentY       = useSharedValue(24);

  useEffect(() => {
    if (!confirmed) return;
    circleScale.value    = withSpring(1, { damping: 10, stiffness: 220 });
    checkScale.value     = withDelay(220, withSpring(1, { damping: 7, stiffness: 280 }));
    contentOpacity.value = withDelay(480, withTiming(1,  { duration: 380 }));
    contentY.value       = withDelay(480, withTiming(0,  { duration: 380 }));
  }, [confirmed]);

  const circleStyle  = useAnimatedStyle(() => ({ transform: [{ scale: circleScale.value }] }));
  const checkStyle   = useAnimatedStyle(() => ({
    opacity: checkScale.value,
    transform: [{ scale: checkScale.value }],
  }));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentY.value }],
  }));

  // ── Handlers ──────────────────────────────────────────────────────
  const handleConfirm = async () => {
    setLoading(true);
    try {
      await transactionApi.confirm(transactionId);
      vibrate([0, 100, 50, 100]);
      setConfirmedAt(dayjs());
      setConfirmed(true);
    } catch (err) {
      Alert.alert('Erreur', err.userMessage || 'Impossible de confirmer. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert('Annuler la transaction ?', 'Cette transaction sera annulée.', [
      { text: 'Non, garder', style: 'cancel' },
      {
        text: 'Oui, annuler', style: 'destructive',
        onPress: async () => {
          try { await transactionApi.cancel(transactionId, 'Annulé par le commerçant'); } catch (_) {}
          navigation.navigate('home');
        },
      },
    ]);
  };

  const handleShare = async () => {
    const ref  = transactionId?.slice(0, 8).toUpperCase();
    const date = (confirmedAt || dayjs()).format('DD/MM/YYYY HH:mm');
    const text = [
      '✅ Reçu PayMe Africa',
      '─────────────────────',
      `Montant : ${formatAmount(amountNum)}`,
      `Mode    : ${PROVIDER_LABELS[provider] || provider}`,
      `Date    : ${date}`,
      `Réf.    : ${ref}`,
      '─────────────────────',
      'Merci pour votre achat !',
    ].join('\n');
    try { await Share.share({ message: text, title: 'Reçu PayMe Africa' }); } catch (_) {}
  };

  // ── Écran succès ──────────────────────────────────────────────────
  if (confirmed) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.successContainer}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={[styles.successCircle, circleStyle]}>
            <Animated.Text style={[styles.checkMark, checkStyle]}>✓</Animated.Text>
          </Animated.View>

          <Animated.View style={[styles.successContent, contentStyle]}>
            <Text style={styles.successTitle}>Paiement confirmé !</Text>
            <Text style={styles.successAmount}>{formatAmount(amountNum)}</Text>
            <Text style={styles.successProvider}>{PROVIDER_LABELS[provider] || provider}</Text>
            <Text style={styles.successTime}>
              {(confirmedAt || dayjs()).format('HH:mm · D MMM YYYY')}
            </Text>

            <View style={styles.receiptCard}>
              <Text style={styles.receiptTitle}>🧾 Reçu</Text>
              {[
                ['Montant', formatAmount(amountNum)],
                ['Mode',    PROVIDER_LABELS[provider] || provider],
                ['Statut',  '✓ Confirmé'],
                ['Réf.',    transactionId?.slice(0, 8).toUpperCase()],
              ].map(([label, value]) => (
                <View key={label} style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>{label}</Text>
                  <Text style={[
                    styles.receiptValue,
                    label === 'Statut' && { color: Colors.success },
                  ]}>
                    {value}
                  </Text>
                </View>
              ))}
            </View>

            <Button
              title="📤  Partager le reçu"
              variant="outline"
              onPress={handleShare}
              size="lg"
              style={styles.actionBtn}
            />
            <Button
              title="Nouvel encaissement"
              onPress={() => navigation.navigate('encaissement')}
              size="lg"
              style={styles.actionBtn}
            />
            <Button
              title="Retour à l'accueil"
              variant="ghost"
              onPress={() => navigation.navigate('home')}
            />
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Écran attente ─────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerIcon}>{PROVIDER_ICONS[provider] || '💳'}</Text>
          <Text style={styles.headerAmount}>{formatAmount(amountNum)}</Text>
          <Text style={styles.headerProvider}>{PROVIDER_LABELS[provider] || provider}</Text>
        </View>

        {instructions ? (
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsTitle}>📋 Instructions</Text>
            <Text style={styles.instructionsText}>{instructions}</Text>
          </View>
        ) : null}

        {provider === 'wave' && (
          <View style={styles.stepsCard}>
            <Text style={styles.stepsTitle}>Comment recevoir un paiement Wave</Text>
            {[
              "Dites au client d'ouvrir son application Wave",
              `Demandez-lui d'envoyer ${formatAmount(amountNum)} sur votre numéro Wave`,
              'Attendez la notification de réception Wave',
              "Confirmez dès que vous avez reçu l'argent",
            ].map((s, i) => (
              <View key={i} style={styles.step}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{i + 1}</Text>
                </View>
                <Text style={styles.stepText}>{s}</Text>
              </View>
            ))}
          </View>
        )}

        <Button
          title="✅  J'ai reçu le paiement"
          onPress={handleConfirm}
          loading={loading}
          size="xl"
          variant="success"
          style={{ marginBottom: Spacing.md }}
        />
        <Button title="Annuler" variant="outline" onPress={handleCancel} size="md" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.lg, paddingBottom: Spacing.xxl },

  // Waiting screen
  header:         { alignItems: 'center', paddingVertical: Spacing.xl },
  headerIcon:     { fontSize: 64, marginBottom: Spacing.md },
  headerAmount:   { fontSize: 48, fontWeight: Typography.fontWeightExtrabold, color: Colors.gray900 },
  headerProvider: { fontSize: Typography.fontSizeLG, color: Colors.gray600, marginTop: 4 },

  instructionsCard:  { backgroundColor: Colors.infoBg, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md },
  instructionsTitle: { fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightBold, color: Colors.info, marginBottom: Spacing.sm },
  instructionsText:  { fontSize: Typography.fontSizeMD, color: Colors.gray800, lineHeight: 24 },

  stepsCard:    { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.xl, ...Shadows.sm },
  stepsTitle:   { fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightBold, color: Colors.gray900, marginBottom: Spacing.md },
  step:         { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.md },
  stepNum:      { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md, marginTop: 2 },
  stepNumText:  { color: Colors.white, fontWeight: Typography.fontWeightBold, fontSize: Typography.fontSizeSM },
  stepText:     { flex: 1, fontSize: Typography.fontSizeMD, color: Colors.gray700, lineHeight: 22 },

  // Success screen
  successContainer: { alignItems: 'center', padding: Spacing.lg, paddingBottom: Spacing.xxl, paddingTop: Spacing.xl },
  successCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: Colors.success,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: Spacing.xl,
    ...Shadows.md,
  },
  checkMark: {
    fontSize: 54, color: Colors.white,
    fontWeight: Typography.fontWeightExtrabold,
    lineHeight: 62,
  },
  successContent:  { width: '100%', alignItems: 'center' },
  successTitle:    { fontSize: Typography.fontSize2XL, fontWeight: Typography.fontWeightExtrabold, color: Colors.success, marginBottom: Spacing.sm, textAlign: 'center' },
  successAmount:   { fontSize: 44, fontWeight: Typography.fontWeightExtrabold, color: Colors.gray900, marginBottom: Spacing.sm },
  successProvider: { fontSize: Typography.fontSizeLG, color: Colors.gray600, marginBottom: 4 },
  successTime:     { fontSize: Typography.fontSizeSM, color: Colors.gray500, marginBottom: Spacing.xl },

  receiptCard:  { width: '100%', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.xl, ...Shadows.md },
  receiptTitle: { fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold, color: Colors.gray900, marginBottom: Spacing.md },
  receiptRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
  receiptLabel: { fontSize: Typography.fontSizeMD, color: Colors.gray600 },
  receiptValue: { fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightSemibold, color: Colors.gray900 },

  actionBtn: { width: '100%', marginBottom: Spacing.sm },
});
