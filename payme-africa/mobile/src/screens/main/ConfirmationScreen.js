import React, { useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, Platform, Vibration, Share,
} from 'react-native';
import { Colors, formatAmount, PROVIDER_LABELS } from '../../utils/theme';
import { transactionApi } from '../../services/api';
import dayjs from 'dayjs';

const P_ICON = { wave: '🌊', orange_money: '🟠', free_money: '🔴', cash: '💵' };

export default function ConfirmationScreen({ navigation, route }) {
  const { transactionId, amount, provider, instructions } = route?.params || {};
  const [loading, setLoading]   = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [txRef] = useState(transactionId?.slice(0, 8).toUpperCase() || '—');

  const amountNum = parseInt(amount || '0');

  const vibe = () => { if (Platform.OS !== 'web') Vibration.vibrate([0, 80, 40, 120]); };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await transactionApi.confirm(transactionId);
      vibe();
      setConfirmed(true);
    } catch (err) {
      Alert.alert('Erreur', err.userMessage || 'Impossible de confirmer. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert('Annuler ?', 'Cette transaction sera annulée.', [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui, annuler', style: 'destructive',
        onPress: async () => {
          try { await transactionApi.cancel(transactionId, 'Annulé par le commerçant'); } catch {}
          navigation.navigate('home');
        },
      },
    ]);
  };

  const handleShare = async () => {
    const msg =
      `✅ Reçu PayMe Africa\n` +
      `Montant : ${formatAmount(amountNum)}\n` +
      `Mode    : ${PROVIDER_LABELS[provider] || provider}\n` +
      `Date    : ${dayjs().format('DD/MM/YYYY HH:mm')}\n` +
      `Réf.    : ${txRef}\n` +
      `Merci pour votre achat !`;
    try {
      await Share.share({ message: msg, title: 'Reçu PayMe Africa' });
    } catch {}
  };

  // ── SUCCÈS ────────────────────────────────────────────────────
  if (confirmed) {
    return (
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.successWrap}>
          {/* Animation check */}
          <View style={s.checkCircle}>
            <Text style={s.checkEmoji}>✅</Text>
          </View>
          <Text style={s.successTitle}>Paiement confirmé !</Text>
          <Text style={s.successAmt}>{formatAmount(amountNum)}</Text>
          <Text style={s.successProvider}>{P_ICON[provider]} {PROVIDER_LABELS[provider] || provider}</Text>
          <Text style={s.successTime}>{dayjs().format('HH:mm · D MMMM YYYY')}</Text>

          {/* Reçu */}
          <View style={s.receipt}>
            <View style={s.receiptHeader}>
              <Text style={s.receiptLogo}>💚 PayMe Africa</Text>
              <Text style={s.receiptDate}>{dayjs().format('D MMM YYYY, HH:mm')}</Text>
            </View>
            {[
              ['Montant', formatAmount(amountNum)],
              ['Mode de paiement', `${P_ICON[provider]} ${PROVIDER_LABELS[provider] || provider}`],
              ['Statut', '✅ Payé'],
              ['Référence', txRef],
            ].map(([label, value]) => (
              <View key={label} style={s.receiptRow}>
                <Text style={s.receiptLabel}>{label}</Text>
                <Text style={[s.receiptValue, label === 'Statut' && { color: Colors.success }]}>{value}</Text>
              </View>
            ))}
          </View>

          {/* Actions */}
          <TouchableOpacity style={s.shareBtn} onPress={handleShare}>
            <Text style={s.shareBtnTxt}>📤 Partager le reçu</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.newBtn} onPress={() => navigation.navigate('encaissement')}>
            <Text style={s.newBtnTxt}>💰 Nouvel encaissement</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.homeBtn} onPress={() => navigation.navigate('home')}>
            <Text style={s.homeBtnTxt}>Retour à l'accueil</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── EN ATTENTE ────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Montant + provider */}
        <View style={s.waitHeader}>
          <Text style={s.waitIcon}>{P_ICON[provider] || '💳'}</Text>
          <Text style={s.waitAmt}>{formatAmount(amountNum)}</Text>
          <Text style={s.waitProvider}>{PROVIDER_LABELS[provider] || provider}</Text>
        </View>

        {/* Instructions */}
        {instructions ? (
          <View style={s.infoBox}>
            <Text style={s.infoTitle}>📋 Instructions</Text>
            <Text style={s.infoTxt}>{instructions}</Text>
          </View>
        ) : null}

        {/* Étapes Wave */}
        {provider === 'wave' && (
          <View style={s.stepsBox}>
            <Text style={s.stepsTitle}>Comment encaisser via Wave</Text>
            {[
              "Demandez au client d'ouvrir son app Wave",
              `Client envoie ${formatAmount(amountNum)} sur votre numéro Wave`,
              'Vérifiez que vous avez bien reçu la notification',
              "Confirmez dès réception",
            ].map((step, i) => (
              <View key={i} style={s.step}>
                <View style={s.stepNum}><Text style={s.stepNumTxt}>{i + 1}</Text></View>
                <Text style={s.stepTxt}>{step}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Boutons */}
        <TouchableOpacity
          style={[s.confirmBtn, loading && { opacity: 0.5 }]}
          onPress={handleConfirm}
          disabled={loading}
        >
          <Text style={s.confirmBtnTxt}>
            {loading ? 'Confirmation...' : "✅  J'ai reçu le paiement"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.cancelBtn} onPress={handleCancel}>
          <Text style={s.cancelBtnTxt}>Annuler la transaction</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  successWrap: { padding: 24, alignItems: 'center', paddingBottom: 48 },
  checkCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center', marginBottom: 16, marginTop: 20 },
  checkEmoji: { fontSize: 50 },
  successTitle: { fontSize: 26, fontWeight: '800', color: '#065F46', marginBottom: 6 },
  successAmt: { fontSize: 48, fontWeight: '800', color: Colors.gray900, marginBottom: 4 },
  successProvider: { fontSize: 17, color: Colors.gray500, marginBottom: 4 },
  successTime: { fontSize: 13, color: Colors.gray400, marginBottom: 24 },

  receipt: { width: '100%', backgroundColor: Colors.white, borderRadius: 18, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  receiptHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  receiptLogo: { fontSize: 15, fontWeight: '800', color: Colors.primary },
  receiptDate: { fontSize: 12, color: Colors.gray400 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.gray100 },
  receiptLabel: { fontSize: 14, color: Colors.gray500 },
  receiptValue: { fontSize: 14, fontWeight: '700', color: Colors.gray900 },

  shareBtn: { width: '100%', backgroundColor: Colors.primaryBg, borderRadius: 14, height: 52, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  shareBtnTxt: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  newBtn: { width: '100%', backgroundColor: Colors.primary, borderRadius: 14, height: 56, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  newBtnTxt: { fontSize: 17, fontWeight: '800', color: Colors.white },
  homeBtn: { padding: 14 },
  homeBtnTxt: { fontSize: 15, color: Colors.gray400, textAlign: 'center' },

  waitHeader: { alignItems: 'center', paddingVertical: 28 },
  waitIcon: { fontSize: 64, marginBottom: 10 },
  waitAmt: { fontSize: 44, fontWeight: '800', color: Colors.gray900 },
  waitProvider: { fontSize: 17, color: Colors.gray500, marginTop: 4 },

  infoBox: { backgroundColor: '#EFF6FF', borderRadius: 14, padding: 16, marginBottom: 14 },
  infoTitle: { fontSize: 15, fontWeight: '700', color: '#1D4ED8', marginBottom: 6 },
  infoTxt: { fontSize: 15, color: '#1E40AF', lineHeight: 22 },

  stepsBox: { backgroundColor: Colors.white, borderRadius: 14, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  stepsTitle: { fontSize: 15, fontWeight: '700', color: Colors.gray900, marginBottom: 12 },
  step: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  stepNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12, marginTop: 1 },
  stepNumTxt: { color: Colors.white, fontWeight: '800', fontSize: 13 },
  stepTxt: { flex: 1, fontSize: 15, color: Colors.gray700, lineHeight: 22 },

  confirmBtn: { backgroundColor: '#059669', borderRadius: 16, height: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  confirmBtnTxt: { fontSize: 18, fontWeight: '800', color: Colors.white },
  cancelBtn: { borderRadius: 14, height: 48, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border },
  cancelBtnTxt: { fontSize: 15, color: Colors.gray500, fontWeight: '600' },
});
