import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, Share, ActivityIndicator,
} from 'react-native';
import { Colors, formatAmount, PROVIDER_LABELS } from '../../utils/theme';
import { transactionApi } from '../../services/api';
import dayjs from 'dayjs';

const P_ICON   = { wave: '🌊', orange_money: '🟠', free_money: '🔴', cash: '💵' };
const ST_COLOR = { completed: '#059669', awaiting_confirmation: '#856404', cancelled: Colors.gray500, failed: Colors.error };
const ST_LABEL = { completed: '✅ Confirmé', awaiting_confirmation: '⏳ En attente', cancelled: '❌ Annulé', failed: '⛔ Échoué' };

export default function TransactionScreen({ navigation, route }) {
  const { transactionId } = route?.params || {};
  const [tx, setTx]           = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    transactionApi.getById(transactionId)
      .then((r) => setTx(r.data.transaction))
      .catch(() => navigation.goBack())
      .finally(() => setLoading(false));
  }, [transactionId]);

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

  const handleShare = async () => {
    if (!tx) return;
    const msg =
      `✅ Reçu PayMe Africa\n` +
      `Montant : ${formatAmount(tx.amount)}\n` +
      `Mode    : ${PROVIDER_LABELS[tx.payment_provider]}\n` +
      `Date    : ${dayjs(tx.created_at).format('DD/MM/YYYY HH:mm')}\n` +
      `Réf.    : ${tx.id?.slice(0, 8).toUpperCase()}\n` +
      `Merci pour votre achat !`;
    await Share.share({ message: msg });
  };

  if (loading) return (
    <SafeAreaView style={s.safe}>
      <ActivityIndicator color={Colors.primary} style={{ flex: 1 }} size="large" />
    </SafeAreaView>
  );

  if (!tx) return null;

  const status   = tx.payment_status;
  const provider = tx.payment_provider;
  const canConfirm = ['pending', 'awaiting_confirmation'].includes(status);

  return (
    <SafeAreaView style={s.safe}>
      {/* NavBar */}
      <View style={s.nav}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← Retour</Text>
        </TouchableOpacity>
        <Text style={s.navTitle}>Transaction</Text>
        {tx.payment_status === 'completed'
          ? <TouchableOpacity onPress={handleShare}><Text style={s.shareBtn}>📤</Text></TouchableOpacity>
          : <View style={{ width: 40 }} />
        }
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Montant + statut */}
        <View style={s.amountCard}>
          <Text style={s.amtIcon}>{P_ICON[provider] || '💳'}</Text>
          <Text style={s.amt}>{formatAmount(tx.amount)}</Text>
          <View style={[s.badge, { backgroundColor: (ST_COLOR[status] || Colors.gray400) + '18' }]}>
            <Text style={[s.badgeTxt, { color: ST_COLOR[status] || Colors.gray400 }]}>
              {ST_LABEL[status] || status}
            </Text>
          </View>
        </View>

        {/* Détails */}
        <View style={s.card}>
          <Row label="Mode de paiement" value={`${P_ICON[provider]} ${PROVIDER_LABELS[provider] || provider}`} />
          <Sep />
          <Row label="Date" value={dayjs(tx.created_at).format('D MMM YYYY, HH:mm')} />
          <Sep />
          <Row label="Référence" value={tx.id?.slice(0, 8).toUpperCase()} />
          {tx.note && <><Sep /><Row label="Note" value={tx.note} /></>}
          {tx.customer_name && <><Sep /><Row label="Client" value={tx.customer_name} /></>}
        </View>

        {/* Articles */}
        {tx.items_snapshot && tx.items_snapshot.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Articles</Text>
            {tx.items_snapshot.map((item, i) => (
              <View key={i}>
                {i > 0 && <Sep />}
                <Row label={`${item.name} ×${item.qty}`} value={formatAmount(item.price * item.qty)} />
              </View>
            ))}
            <Sep />
            <Row label="Total" value={formatAmount(tx.amount)} bold />
          </View>
        )}

        {/* Action confirmer */}
        {canConfirm && (
          <TouchableOpacity
            style={[s.confirmBtn, confirming && { opacity: 0.5 }]}
            onPress={handleConfirm}
            disabled={confirming}
          >
            <Text style={s.confirmTxt}>{confirming ? 'Confirmation...' : "✅  Confirmer le paiement"}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const Row = ({ label, value, bold }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
    <Text style={{ fontSize: 14, color: Colors.gray500, flex: 1 }}>{label}</Text>
    <Text style={{ fontSize: 14, fontWeight: bold ? '800' : '600', color: Colors.gray900, flex: 1, textAlign: 'right' }}>{value}</Text>
  </View>
);
const Sep = () => <View style={{ height: 1, backgroundColor: Colors.gray100 }} />;

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border },
  back: { fontSize: 15, color: Colors.primary, fontWeight: '600', width: 80 },
  navTitle: { fontSize: 17, fontWeight: '700', color: Colors.gray900 },
  shareBtn: { fontSize: 22, width: 40, textAlign: 'right' },
  amountCard: { backgroundColor: Colors.white, borderRadius: 18, padding: 24, alignItems: 'center', marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 },
  amtIcon: { fontSize: 44, marginBottom: 8 },
  amt: { fontSize: 44, fontWeight: '800', color: Colors.gray900, marginBottom: 10 },
  badge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 99 },
  badgeTxt: { fontSize: 14, fontWeight: '700' },
  card: { backgroundColor: Colors.white, borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.gray900, marginBottom: 8 },
  confirmBtn: { backgroundColor: '#059669', borderRadius: 16, height: 58, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  confirmTxt: { fontSize: 18, fontWeight: '800', color: Colors.white },
});
