import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, RefreshControl, ActivityIndicator
} from 'react-native';
import { Card, StatusBadge } from '../../components/ui';
import {
  Colors, Typography, Spacing, BorderRadius, Shadows,
  formatAmount, PROVIDER_LABELS, PROVIDER_COLORS
} from '../../utils/theme';
import { transactionApi, walletApi } from '../../services/api';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { getQueue, syncAll } from '../../services/offlineQueue';
import useStore from '../../store/useStore';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
dayjs.locale('fr');

export default function HomeScreen({ navigation }) {
  const merchant      = useStore((s) => s.merchant);
  const { isOnline }  = useNetworkStatus();
  const [stats, setStats]         = useState(null);
  const [wallet, setWallet]       = useState(null);
  const [recentTxs, setRecentTxs] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingCount, setPendingCount] = useState(getQueue().length);
  const [syncing, setSyncing]     = useState(false);

  const load = useCallback(async () => {
    try {
      const [statsRes, historyRes, walletRes] = await Promise.all([
        transactionApi.getDayStats(),
        transactionApi.getHistory({ limit: 5 }),
        walletApi.getBalance(),
      ]);
      setStats(statsRes.data.stats);
      setRecentTxs(historyRes.data.transactions);
      setWallet(walletRes.data);
    } catch (_) {}
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPendingCount(getQueue().length); }, []);

  // Sync quand réseau revient
  useEffect(() => {
    if (isOnline && getQueue().length > 0) {
      setSyncing(true);
      syncAll((payload) => transactionApi.initiate(payload))
        .then(() => { setPendingCount(getQueue().length); load(); })
        .finally(() => setSyncing(false));
    }
  }, [isOnline]);

  const handleSync = async () => {
    if (!isOnline || syncing) return;
    setSyncing(true);
    await syncAll((payload) => transactionApi.initiate(payload)).catch(() => {});
    setPendingCount(getQueue().length);
    setSyncing(false);
    load();
  };

  const today = dayjs().format('dddd D MMMM');

  return (
    <SafeAreaView style={styles.safe}>
      {/* Bannière offline */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>
            📵 Hors connexion{pendingCount > 0 ? ` · ${pendingCount} transaction(s) en attente` : ''}
          </Text>
        </View>
      )}
      {isOnline && syncing && (
        <View style={styles.syncBanner}>
          <Text style={styles.syncBannerText}>🔄 Synchronisation...</Text>
        </View>
      )}

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Bonjour 👋</Text>
            <Text style={styles.businessName} numberOfLines={1}>{merchant?.businessName}</Text>
            <Text style={styles.date}>{today}</Text>
          </View>
          <TouchableOpacity style={styles.avatarBtn} onPress={() => navigation.navigate('profile')}>
            <Text style={styles.avatarText}>{merchant?.businessName?.[0]?.toUpperCase() || 'M'}</Text>
          </TouchableOpacity>
        </View>

        {/* Bouton ENCAISSER */}
        <TouchableOpacity
          style={styles.cashButton}
          onPress={() => navigation.navigate('encaissement')}
          activeOpacity={0.85}
        >
          <Text style={styles.cashButtonIcon}>💰</Text>
          <Text style={styles.cashButtonText}>Encaisser</Text>
          <Text style={styles.cashButtonSub}>Touchez pour encaisser</Text>
        </TouchableOpacity>

        {/* Badge offline pending */}
        {pendingCount > 0 && isOnline && (
          <TouchableOpacity style={styles.pendingBanner} onPress={handleSync} activeOpacity={0.8}>
            <Text style={styles.pendingIcon}>📤</Text>
            <Text style={styles.pendingText}>{pendingCount} transaction(s) à synchroniser</Text>
            <Text style={styles.pendingAction}>Sync →</Text>
          </TouchableOpacity>
        )}

        {/* Stats du jour */}
        {loading ? (
          <ActivityIndicator color={Colors.primary} style={styles.loader} />
        ) : (
          <>
            <View style={styles.statsRow}>
              <StatCard label="CA aujourd'hui" value={formatAmount(stats?.totalAmount || 0)} icon="💵" color={Colors.primary} />
              <StatCard label="Transactions" value={String(stats?.completedCount || 0)} icon="✅" color={Colors.success} />
            </View>

            {/* Stats semaine / mois depuis wallet */}
            {wallet && (
              <Card style={styles.walletCard}>
                <Text style={styles.walletTitle}>📊 Bilan</Text>
                <View style={styles.walletRow}>
                  <WalletStat label="Cette semaine" value={formatAmount(wallet.balance_week || 0)} />
                  <View style={styles.walletDivider} />
                  <WalletStat label="Ce mois" value={formatAmount(wallet.balance_month || 0)} />
                </View>
              </Card>
            )}
          </>
        )}

        {/* Répartition providers */}
        {stats?.byProvider && Object.keys(stats.byProvider).length > 0 && (
          <Card style={styles.providerCard}>
            <Text style={styles.sectionTitle}>Répartition du jour</Text>
            {Object.entries(stats.byProvider).map(([provider, data]) => (
              <ProviderRow key={provider} provider={provider} data={data} />
            ))}
          </Card>
        )}

        {/* Raccourcis */}
        <View style={styles.shortcuts}>
          <ShortcutBtn icon="📋" label="Historique"  onPress={() => navigation.navigate('history')} />
          <ShortcutBtn icon="📦" label="Catalogue"   onPress={() => navigation.navigate('catalog')} />
          <ShortcutBtn icon="📊" label="Rapports"    onPress={() => navigation.navigate('reports')} />
          <ShortcutBtn icon="🔔" label="Notifications" onPress={() => navigation.navigate('notifications')} />
        </View>

        {/* Transactions récentes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Récentes</Text>
            <TouchableOpacity onPress={() => navigation.navigate('history')}>
              <Text style={styles.seeAll}>Tout voir →</Text>
            </TouchableOpacity>
          </View>
          {recentTxs.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>Pas encore de transaction aujourd'hui</Text>
            </Card>
          ) : (
            recentTxs.map((tx) => (
              <TxRow
                key={tx.id}
                tx={tx}
                onPress={() => navigation.navigate('transactionDetail', { transactionId: tx.id })}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Composants internes ──────────────────────────────────────────────────────
function StatCard({ label, value, icon, color }) {
  return (
    <Card style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

function WalletStat({ label, value }) {
  return (
    <View style={styles.walletStat}>
      <Text style={styles.walletStatValue}>{value}</Text>
      <Text style={styles.walletStatLabel}>{label}</Text>
    </View>
  );
}

function ProviderRow({ provider, data }) {
  const icons = { wave: '🌊', orange_money: '🟠', cash: '💵', paydunya: '💳' };
  return (
    <View style={styles.providerRow}>
      <Text style={styles.providerDotIcon}>{icons[provider] || '💳'}</Text>
      <Text style={styles.providerName}>{PROVIDER_LABELS[provider] || provider}</Text>
      <Text style={styles.providerAmount}>{formatAmount(data.amount)}</Text>
      <Text style={styles.providerCount}>({data.count})</Text>
    </View>
  );
}

function ShortcutBtn({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.shortcutBtn} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.shortcutIcon}>{icon}</Text>
      <Text style={styles.shortcutLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function TxRow({ tx, onPress }) {
  const icons = { wave: '🌊', orange_money: '🟠', cash: '💵', paydunya: '💳' };
  return (
    <TouchableOpacity style={styles.txRow} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.txIcon, { backgroundColor: (PROVIDER_COLORS[tx.paymentProvider] || Colors.gray400) + '20' }]}>
        <Text style={styles.txIconText}>{icons[tx.paymentProvider] || '💳'}</Text>
      </View>
      <View style={styles.txInfo}>
        <Text style={styles.txProvider}>{PROVIDER_LABELS[tx.paymentProvider] || tx.paymentProvider}</Text>
        {tx.note ? <Text style={styles.txNote} numberOfLines={1}>{tx.note}</Text> : null}
        <Text style={styles.txTime}>{dayjs(tx.createdAt).format('HH:mm')}</Text>
      </View>
      <View style={styles.txRight}>
        <Text style={styles.txAmount}>{formatAmount(tx.amount)}</Text>
        <StatusBadge status={tx.paymentStatus} />
      </View>
    </TouchableOpacity>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: Colors.background },
  offlineBanner:   { backgroundColor: '#B91C1C', paddingVertical: 8, paddingHorizontal: Spacing.md },
  offlineBannerText:{ color: '#fff', fontSize: Typography.fontSizeSM, textAlign: 'center', fontWeight: Typography.fontWeightSemibold },
  syncBanner:      { backgroundColor: '#1D4ED8', paddingVertical: 6, paddingHorizontal: Spacing.md },
  syncBannerText:  { color: '#fff', fontSize: Typography.fontSizeSM, textAlign: 'center' },

  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: Spacing.lg, paddingTop: Spacing.xl },
  greeting:        { fontSize: Typography.fontSizeMD, color: Colors.gray600 },
  businessName:    { fontSize: Typography.fontSizeXL, fontWeight: Typography.fontWeightBold, color: Colors.gray900 },
  date:            { fontSize: Typography.fontSizeSM, color: Colors.gray500, marginTop: 2, textTransform: 'capitalize' },
  avatarBtn:       { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginLeft: Spacing.md },
  avatarText:      { color: Colors.white, fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold },

  cashButton:      { margin: Spacing.lg, backgroundColor: Colors.primary, borderRadius: BorderRadius.xl, padding: Spacing.xl, alignItems: 'center', ...Shadows.lg },
  cashButtonIcon:  { fontSize: 48, marginBottom: Spacing.sm },
  cashButtonText:  { fontSize: Typography.fontSize3XL, fontWeight: Typography.fontWeightExtrabold, color: Colors.white },
  cashButtonSub:   { fontSize: Typography.fontSizeMD, color: Colors.primaryBg, marginTop: 4 },

  pendingBanner:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', marginHorizontal: Spacing.lg, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md, borderLeftWidth: 4, borderLeftColor: '#F59E0B' },
  pendingIcon:     { fontSize: 18, marginRight: Spacing.sm },
  pendingText:     { flex: 1, fontSize: Typography.fontSizeSM, color: '#92400E', fontWeight: Typography.fontWeightMedium },
  pendingAction:   { fontSize: Typography.fontSizeSM, color: '#B45309', fontWeight: Typography.fontWeightBold },

  loader:          { marginVertical: Spacing.xl },
  statsRow:        { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: Spacing.md, marginBottom: Spacing.md },
  statCard:        { flex: 1, alignItems: 'center', paddingVertical: Spacing.lg },
  statIcon:        { fontSize: 28, marginBottom: Spacing.sm },
  statValue:       { fontSize: Typography.fontSizeXL, fontWeight: Typography.fontWeightExtrabold },
  statLabel:       { fontSize: Typography.fontSizeSM, color: Colors.gray500, textAlign: 'center', marginTop: 2 },

  walletCard:      { marginHorizontal: Spacing.lg, marginBottom: Spacing.md, padding: Spacing.lg },
  walletTitle:     { fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightBold, color: Colors.gray900, marginBottom: Spacing.md },
  walletRow:       { flexDirection: 'row', alignItems: 'center' },
  walletStat:      { flex: 1, alignItems: 'center' },
  walletStatValue: { fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightExtrabold, color: Colors.primary },
  walletStatLabel: { fontSize: Typography.fontSizeSM, color: Colors.gray500, marginTop: 2 },
  walletDivider:   { width: 1, height: 36, backgroundColor: Colors.border },

  providerCard:    { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  providerRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  providerDotIcon: { fontSize: 16, marginRight: Spacing.sm },
  providerName:    { flex: 1, fontSize: Typography.fontSizeMD, color: Colors.gray700 },
  providerAmount:  { fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightSemibold, color: Colors.gray900 },
  providerCount:   { fontSize: Typography.fontSizeSM, color: Colors.gray500, marginLeft: 4 },

  shortcuts:       { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.md, flexWrap: 'wrap' },
  shortcutBtn:     { flex: 1, minWidth: '20%', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, paddingVertical: Spacing.md, paddingHorizontal: 4, alignItems: 'center', ...Shadows.sm },
  shortcutIcon:    { fontSize: 24, marginBottom: 4 },
  shortcutLabel:   { fontSize: 10, fontWeight: Typography.fontWeightSemibold, color: Colors.gray700, textAlign: 'center' },

  section:         { padding: Spacing.lg, paddingTop: 0 },
  sectionHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle:    { fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold, color: Colors.gray900 },
  seeAll:          { fontSize: Typography.fontSizeMD, color: Colors.primary, fontWeight: Typography.fontWeightMedium },

  emptyCard:       { alignItems: 'center', padding: Spacing.xl },
  emptyIcon:       { fontSize: 36, marginBottom: Spacing.sm },
  emptyText:       { fontSize: Typography.fontSizeMD, color: Colors.gray500, textAlign: 'center' },

  txRow:           { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.sm },
  txIcon:          { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  txIconText:      { fontSize: 22 },
  txInfo:          { flex: 1 },
  txProvider:      { fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightSemibold, color: Colors.gray900 },
  txNote:          { fontSize: Typography.fontSizeSM, color: Colors.gray500, marginTop: 1 },
  txTime:          { fontSize: Typography.fontSizeSM, color: Colors.gray500, marginTop: 1 },
  txRight:         { alignItems: 'flex-end', gap: 4 },
  txAmount:        { fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold, color: Colors.gray900 },
});
