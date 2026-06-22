import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator, Linking, Share,
} from 'react-native';
import {
  Colors, Typography, Spacing, BorderRadius, Shadows,
  formatAmount, PROVIDER_LABELS,
} from '../../utils/theme';
import { transactionApi } from '../../services/api';
import dayjs from 'dayjs';

const P_ICON = { wave: '🌊', orange_money: '🟠', free_money: '🔴', cash: '💵', paydunya: '💳' };
const ST_COLOR = {
  completed:              '#059669',
  awaiting_confirmation:  '#92400E',
  pending:                '#1D4ED8',
  cancelled:              Colors.gray500,
  failed:                 '#DC2626',
};
const ST_LABEL = {
  completed:              '✅ Confirmé',
  awaiting_confirmation:  '⏳ En attente de confirmation',
  pending:                '🔄 En cours',
  cancelled:              '❌ Annulé',
  failed:                 '⛔ Échoué',
};

function buildReceiptText(tx) {
  const ref = tx.id?.slice(0, 8).toUpperCase();
  const date = dayjs(tx.createdAt).format('DD/MM/YYYY HH:mm');
  const provider = PROVIDER_LABELS[tx.paymentProvider] || tx.paymentProvider;
  let msg = `*✅ Reçu de paiement — PayMe Africa*\n\n`;
  msg += `💰 *Montant :* ${formatAmount(tx.amount)}\n`;
  msg += `💳 *Mode :* ${provider}\n`;
  msg += `📅 *Date :* ${date}\n`;
  msg += `🔖 *Réf. :* ${ref}\n`;
  if (tx.note) msg += `📝 *Note :* ${tx.note}\n`;
  msg += `\n_Merci pour votre achat ! 🙏_`;
  return msg;
}

export default function TransactionScreen({ navigation, route }) {
  const { transactionId } = route?.params || {};
  const [tx, setTx]                 = useState(null);
  const [loading, setLoading]       = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    transactionApi.getById(transactionId)
      .then((r) => setTx(r.data.transaction))
      .catch(() => navigation.goBack())
      .finally(() => setLoading(false));
  }, [transactionId]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleConfirm = () => {
    Alert.alert('Confirmer le paiement ?', 'Cette action est irréversible.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Confirmer', onPress: async () => {
          setConfirming(true);
          try {
            const r = await transactionApi.confirm(transactionId);
            setTx(r.data.transaction);
          } catch (err) {
            Alert.alert('Erreur', err.userMessage || 'Impossible de confirmer.');
          } finally { setConfirming(false); }
        },
      },
    ]);
  };

  const handleCancel = () => {
    Alert.alert('Annuler la transaction ?', 'Cette action est irréversible.', [
      { text: 'Retour', style: 'cancel' },
      {
        text: 'Annuler la TX', style: 'destructive',
        onPress: async () => {
          setCancelling(true);
          try {
            const r = await transactionApi.cancel(transactionId, 'Annulation manuelle');
            setTx(r.data.transaction);
          } catch (err) {
            Alert.alert('Erreur', err.userMessage || 'Impossible d\'annuler.');
          } finally { setCancelling(false); }
        },
      },
    ]);
  };

  const handleWhatsApp = async () => {
    if (!tx) return;
    const text = encodeURIComponent(buildReceiptText(tx));
    const url  = `whatsapp://send?text=${text}`;
    const canOpen = await Linking.canOpenURL(url).catch(() => false);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      await Share.share({ message: buildReceiptText(tx) });
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <SafeAreaView style={s.safe}>
      <ActivityIndicator color={Colors.primary} style={{ flex: 1 }} size="large" />
    </SafeAreaView>
  );
  if (!tx) return null;

  const status    = tx.paymentStatus;
  const provider  = tx.paymentProvider;
  const canConfirm = ['pending', 'awaiting_confirmation'].includes(status);
  const canCancel  = ['pending', 'awaiting_confirmation'].includes(status);
  const isDone     = status === 'completed';

  return (
    <SafeAreaView style={s.safe}>
      {/* NavBar */}
      <View style={s.nav}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.navBack}>
          <Text style={s.back}>← Retour</Text>
        </TouchableOpacity>
        <Text style={s.navTitle}>Transaction</Text>
        {isDone ? (
          <TouchableOpacity onPress={handleWhatsApp} style={s.navAction}>
            <Text style={s.shareBtn}>📤</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Montant + statut */}
        <View style={s.amountCard}>
          <Text style={s.amtIcon}>{P_ICON[provider] || '💳'}</Text>
          <Text style={s.amt}>{formatAmount(tx.amount)}</Text>
          <View style={[s.badge, { backgroundColor: (ST_COLOR[status] || Colors.gray400) + '22' }]}>
            <Text style={[s.badgeTxt, { color: ST_COLOR[status] || Colors.gray400 }]}>
              {ST_LABEL[status] || status}
            </Text>
          </View>
        </View>

        {/* Détails */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Détails</Text>
          <Row label="Mode de paiement"  value={`${P_ICON[provider] || '💳'} ${PROVIDER_LABELS[provider] || provider}`} />
          <Sep />
          <Row label="Date"              value={dayjs(tx.createdAt).format('D MMM YYYY, HH:mm')} />
          <Sep />
          <Row label="Référence"         value={tx.id?.slice(0, 8).toUpperCase()} />
          {tx.clientReference && <><Sep /><Row label="Réf. client" value={tx.clientReference?.slice(0, 8).toUpperCase()} /></>}
          {tx.note            && <><Sep /><Row label="Note"         value={tx.note} /></>}
          {tx.customerPhone   && <><Sep /><Row label="Téléphone client" value={tx.customerPhone} /></>}
          {tx.cancelReason    && <><Sep /><Row label="Raison annulation" value={tx.cancelReason} /></>}
        </View>

        {/* Articles */}
        {tx.itemsSnapshot && tx.itemsSnapshot.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>🛒 Articles ({tx.itemsSnapshot.length})</Text>
            {tx.itemsSnapshot.map((item, i) => (
              <View key={i}>
                {i > 0 && <Sep />}
                <Row label={`${item.name} ×${item.qty}`} value={formatAmount(item.subtotal || item.price * item.qty)} />
              </View>
            ))}
            <Sep />
            <Row label="Total" value={formatAmount(tx.amount)} bold />
          </View>
        )}

        {/* WhatsApp reçu (si complété) */}
        {isDone && (
          <TouchableOpacity style={s.whatsappBtn} onPress={handleWhatsApp} activeOpacity={0.85}>
            <Text style={s.whatsappBtnText}>📲 Envoyer le reçu par WhatsApp</Text>
          </TouchableOpacity>
        )}

        {/* Confirmer */}
        {canConfirm && (
          <TouchableOpacity
            style={[s.confirmBtn, (confirming || cancelling) && { opacity: 0.5 }]}
            onPress={handleConfirm}
            disabled={confirming || cancelling}
          >
            <Text style={s.confirmTxt}>{confirming ? 'Confirmation...' : '✅  Confirmer le paiement'}</Text>
          </TouchableOpacity>
        )}

        {/* Annuler */}
        {canCancel && (
          <TouchableOpacity
            style={[s.cancelBtn, (confirming || cancelling) && { opacity: 0.5 }]}
            onPress={handleCancel}
            disabled={confirming || cancelling}
          >
            <Text style={s.cancelTxt}>{cancelling ? 'Annulation...' : '❌  Annuler la transaction'}</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sous-composants ──────────────────────────────────────────────────────────
function Row({ label, value, bold }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, bold && { fontWeight: Typography.fontWeightExtrabold, color: Colors.primary }]}>{value}</Text>
    </View>
  );
}
function Sep() { return <View style={s.sep} />; }

// ── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: Colors.background },
  nav:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  navBack:    { width: 80 },
  navAction:  { width: 40, alignItems: 'flex-end' },
  back:       { fontSize: Typography.fontSizeMD, color: Colors.primary, fontWeight: Typography.fontWeightSemibold },
  navTitle:   { fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold, color: Colors.gray900 },
  shareBtn:   { fontSize: 22 },
  scroll:     { padding: Spacing.lg },

  amountCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.xl, alignItems: 'center', marginBottom: Spacing.md, ...Shadows.md },
  amtIcon:    { fontSize: 48, marginBottom: Spacing.sm },
  amt:        { fontSize: 44, fontWeight: Typography.fontWeightExtrabold, color: Colors.gray900, marginBottom: Spacing.md },
  badge:      { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.full },
  badgeTxt:   { fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightBold },

  card:       { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.sm },
  cardTitle:  { fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightBold, color: Colors.gray900, marginBottom: Spacing.md },

  row:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 8 },
  rowLabel:   { fontSize: Typography.fontSizeMD, color: Colors.gray500, flex: 1 },
  rowValue:   { fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightSemibold, color: Colors.gray900, flex: 1, textAlign: 'right' },
  sep:        { height: 1, backgroundColor: Colors.border },

  whatsappBtn:     { backgroundColor: '#25D366', borderRadius: BorderRadius.lg, height: 54, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md, ...Shadows.sm },
  whatsappBtnText: { fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightBold, color: Colors.white },

  confirmBtn: { backgroundColor: '#059669', borderRadius: BorderRadius.lg, height: 54, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm, ...Shadows.sm },
  confirmTxt: { fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightBold, color: Colors.white },

  cancelBtn:  { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, height: 52, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#DC2626' },
  cancelTxt:  { fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightBold, color: '#DC2626' },
});
