import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, Linking, Share
} from 'react-native';
import { vibrate } from '../../utils/haptics';
import { Button } from '../../components/ui';
import {
  Colors, Typography, Spacing, BorderRadius, Shadows,
  formatAmount, PROVIDER_LABELS
} from '../../utils/theme';
import { transactionApi } from '../../services/api';
import dayjs from 'dayjs';

const PROVIDER_ICONS = {
  wave: '🌊', orange_money: '🟠', free_money: '🔴', cash: '💵', paydunya: '💳'
};

/** Extrait la première URL d'une chaîne */
function extractUrl(text) {
  if (!text) return null;
  const m = text.match(/https?:\/\/\S+/);
  return m ? m[0] : null;
}

/** Génère le message reçu pour WhatsApp */
function buildReceiptMessage({ amount, providerLabel, transactionRef, note, date }) {
  const lines = [
    '✅ *Paiement reçu — PayMe Africa*',
    '',
    `💰 Montant : *${formatAmount(amount)}*`,
    `📱 Mode : ${providerLabel}`,
    `🔖 Réf. : ${transactionRef}`,
    `🗓 Date : ${date}`,
  ];
  if (note) lines.push(`📝 Note : ${note}`);
  lines.push('', '_Encaissé avec PayMe Africa_ 🇸🇳');
  return lines.join('\n');
}

export default function ConfirmationScreen({ navigation, route }) {
  const {
    transactionId,
    amount,
    provider,
    providerLabel: routeLabel,
    providerIcon: routeIcon,
    instructions,
    requiresManualConfirmation,
    note,
  } = route?.params || {};

  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(!requiresManualConfirmation);
  const [confirmedAt, setConfirmedAt] = useState(requiresManualConfirmation ? null : dayjs());

  const amountNum   = parseInt(amount || '0');
  const icon        = routeIcon || PROVIDER_ICONS[provider] || '💳';
  const label       = routeLabel || PROVIDER_LABELS[provider] || provider || '';
  const txRef       = transactionId ? transactionId.slice(0, 8).toUpperCase() : '—';
  const checkoutUrl = extractUrl(instructions);

  // ── Confirmer (paiement reçu manuellement) ────────────────────────────────
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

  // ── Annuler ───────────────────────────────────────────────────────────────
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

  // ── Partager reçu WhatsApp ────────────────────────────────────────────────
  const handleShareWhatsApp = async () => {
    const text = buildReceiptMessage({
      amount: amountNum,
      providerLabel: label,
      transactionRef: txRef,
      note,
      date: (confirmedAt || dayjs()).format('DD/MM/YYYY HH:mm'),
    });
    // Essai WhatsApp direct, fallback Share natif
    const waUrl = `whatsapp://send?text=${encodeURIComponent(text)}`;
    const canOpen = await Linking.canOpenURL(waUrl).catch(() => false);
    if (canOpen) {
      await Linking.openURL(waUrl);
    } else {
      await Share.share({ message: text });
    }
  };

  // ────────────────────────────────────────────────────────────────────────
  // ÉCRAN SUCCÈS
  // ────────────────────────────────────────────────────────────────────────
  if (confirmed) {
    const dateStr = (confirmedAt || dayjs()).format('HH:mm - D MMM YYYY');
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.successContainer} showsVerticalScrollIndicator={false}>
          {/* Header succès */}
          <View style={styles.successBadge}>
            <Text style={styles.successEmoji}>✅</Text>
          </View>
          <Text style={styles.successTitle}>Paiement confirmé !</Text>
          <Text style={styles.successAmount}>{formatAmount(amountNum)}</Text>
          <Text style={styles.successProvider}>{icon} {label}</Text>
          <Text style={styles.successTime}>{dateStr}</Text>

          {/* Reçu */}
          <View style={styles.receiptCard}>
            <Text style={styles.receiptHeader}>🧾 Reçu de paiement</Text>
            <View style={styles.receiptDivider} />
            {[
              ['Montant', formatAmount(amountNum)],
              ['Mode', `${icon} ${label}`],
              ['Statut', '✓ Confirmé'],
              ['Référence', txRef],
              ['Heure', dateStr],
              ...(note ? [['Note', note]] : []),
            ].map(([lbl, val]) => (
              <View key={lbl} style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>{lbl}</Text>
                <Text style={[
                  styles.receiptValue,
                  lbl === 'Statut' && { color: Colors.success },
                ]}>{val}</Text>
              </View>
            ))}
          </View>

          {/* Partage WhatsApp */}
          <TouchableOpacity style={styles.whatsappBtn} onPress={handleShareWhatsApp} activeOpacity={0.85}>
            <Text style={styles.whatsappIcon}>💬</Text>
            <Text style={styles.whatsappText}>Envoyer le reçu par WhatsApp</Text>
          </TouchableOpacity>

          {/* Actions */}
          <Button
            title="+ Nouvel encaissement"
            onPress={() => navigation.navigate('encaissement')}
            size="lg"
            style={styles.actionBtn}
          />
          <Button
            title="Retour à l'accueil"
            variant="ghost"
            onPress={() => navigation.navigate('home')}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ────────────────────────────────────────────────────────────────────────
  // ÉCRAN ATTENTE CONFIRMATION
  // ────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>

        {/* En-tête */}
        <View style={styles.header}>
          <Text style={styles.headerIcon}>{icon}</Text>
          <Text style={styles.headerAmount}>{formatAmount(amountNum)}</Text>
          <Text style={styles.headerProvider}>{label}</Text>
        </View>

        {/* Instructions PayDunya — lien cliquable */}
        {provider === 'paydunya' && instructions && (
          <View style={styles.paydunyaCard}>
            <Text style={styles.paydunyaTitle}>💳 Lien de paiement</Text>
            <Text style={styles.paydunyaText}>
              {instructions.replace(/https?:\/\/\S+/, '').trim() ||
               'Partagez ce lien avec votre client pour qu\'il finalise le paiement.'}
            </Text>
            {checkoutUrl && (
              <TouchableOpacity
                style={styles.linkBtn}
                onPress={() => Linking.openURL(checkoutUrl)}
                activeOpacity={0.85}
              >
                <Text style={styles.linkBtnText}>🔗 Ouvrir le lien de paiement</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.paydunyaNote}>
              Confirmez après réception du paiement.
            </Text>
          </View>
        )}

        {/* Instructions Wave */}
        {provider === 'wave' && !instructions && (
          <View style={styles.stepsCard}>
            <Text style={styles.stepsTitle}>Comment recevoir via Wave 🌊</Text>
            {[
              "Demandez au client d'ouvrir son appli Wave",
              `Demandez-lui d'envoyer ${formatAmount(amountNum)} sur votre numéro`,
              'Attendez la notification de réception',
              'Appuyez sur "J\'ai reçu" ci-dessous',
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

        {/* Instructions Orange Money */}
        {provider === 'orange_money' && !instructions && (
          <View style={styles.stepsCard}>
            <Text style={styles.stepsTitle}>Comment recevoir via Orange Money 🟠</Text>
            {[
              "Demandez au client d'ouvrir son appli Orange Money",
              `Demandez-lui d'envoyer ${formatAmount(amountNum)} sur votre numéro`,
              'Attendez le SMS de confirmation',
              'Appuyez sur "J\'ai reçu" ci-dessous',
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

        {/* Instructions génériques (cash, autres) */}
        {instructions && provider !== 'paydunya' && (
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsTitle}>📋 Instructions</Text>
            <Text style={styles.instructionsText}>{instructions}</Text>
          </View>
        )}

        {/* Résumé mini-reçu */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Montant</Text>
            <Text style={styles.summaryValue}>{formatAmount(amountNum)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Référence</Text>
            <Text style={styles.summaryValue}>{txRef}</Text>
          </View>
        </View>

        {/* Actions */}
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

  // ── Attente ──
  header:         { alignItems: 'center', paddingVertical: Spacing.xl },
  headerIcon:     { fontSize: 64, marginBottom: Spacing.md },
  headerAmount:   { fontSize: 48, fontWeight: Typography.fontWeightExtrabold, color: Colors.gray900 },
  headerProvider: { fontSize: Typography.fontSizeLG, color: Colors.gray600, marginTop: 4 },

  paydunyaCard:   { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md, borderLeftWidth: 4, borderLeftColor: Colors.primary, ...Shadows.sm },
  paydunyaTitle:  { fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightBold, color: Colors.gray900, marginBottom: Spacing.sm },
  paydunyaText:   { fontSize: Typography.fontSizeMD, color: Colors.gray700, lineHeight: 22, marginBottom: Spacing.sm },
  paydunyaNote:   { fontSize: Typography.fontSizeSM, color: Colors.gray500, fontStyle: 'italic', marginTop: Spacing.sm },
  linkBtn:        { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', marginVertical: Spacing.sm },
  linkBtnText:    { color: Colors.white, fontWeight: Typography.fontWeightBold, fontSize: Typography.fontSizeMD },

  stepsCard:    { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.xl, ...Shadows.sm },
  stepsTitle:   { fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightBold, color: Colors.gray900, marginBottom: Spacing.md },
  step:         { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.md },
  stepNum:      { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md, marginTop: 2 },
  stepNumText:  { color: Colors.white, fontWeight: Typography.fontWeightBold, fontSize: Typography.fontSizeSM },
  stepText:     { flex: 1, fontSize: Typography.fontSizeMD, color: Colors.gray700, lineHeight: 22 },

  instructionsCard:  { backgroundColor: Colors.infoBg, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md },
  instructionsTitle: { fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightBold, color: Colors.info, marginBottom: Spacing.sm },
  instructionsText:  { fontSize: Typography.fontSizeMD, color: Colors.gray800, lineHeight: 24 },

  summaryCard: { backgroundColor: Colors.gray50, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.xl, borderWidth: 1, borderColor: Colors.border },
  summaryRow:  { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryLabel:{ fontSize: Typography.fontSizeSM, color: Colors.gray500 },
  summaryValue:{ fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightSemibold, color: Colors.gray700 },

  // ── Succès ──
  successContainer: { alignItems: 'center', padding: Spacing.lg, paddingBottom: Spacing.xxl },
  successBadge:     { width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.successBg, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.lg, marginTop: Spacing.xl },
  successEmoji:     { fontSize: 48 },
  successTitle:     { fontSize: Typography.fontSize2XL, fontWeight: Typography.fontWeightExtrabold, color: Colors.success, marginBottom: Spacing.sm },
  successAmount:    { fontSize: 44, fontWeight: Typography.fontWeightExtrabold, color: Colors.gray900, marginBottom: Spacing.sm },
  successProvider:  { fontSize: Typography.fontSizeLG, color: Colors.gray600, marginBottom: 4 },
  successTime:      { fontSize: Typography.fontSizeSM, color: Colors.gray500, marginBottom: Spacing.xl },

  receiptCard:    { width: '100%', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.lg, ...Shadows.md },
  receiptHeader:  { fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold, color: Colors.gray900, marginBottom: Spacing.sm },
  receiptDivider: { height: 1, backgroundColor: Colors.border, marginBottom: Spacing.md },
  receiptRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: Colors.border },
  receiptLabel:   { fontSize: Typography.fontSizeMD, color: Colors.gray600 },
  receiptValue:   { fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightSemibold, color: Colors.gray900, maxWidth: '60%', textAlign: 'right' },

  whatsappBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#25D366', borderRadius: BorderRadius.lg, padding: Spacing.md, width: '100%', marginBottom: Spacing.md, ...Shadows.sm },
  whatsappIcon: { fontSize: 22, marginRight: Spacing.sm },
  whatsappText: { color: Colors.white, fontWeight: Typography.fontWeightBold, fontSize: Typography.fontSizeMD },

  actionBtn: { width: '100%', marginBottom: Spacing.sm },
});
