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
import { transactionApi } from '../../services/api';
import useStore from '../../store/useStore';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
dayjs.locale('fr');

export default function HomeScreen({ navigation }) {
  const merchant = useStore((s) => s.merchant);
  const [stats, setStats] = useState(null);
  const [recentTxs, setRecentTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [statsRes, historyRes] = await Promise.all([
        transactionApi.getDayStats(),
        transactionApi.getHistory({ limit: 5 }),
      ]);
      setStats(statsRes.data.stats);
      setRecentTxs(historyRes.data.transactions);
    } catch (_) {}
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const today = dayjs().format('dddd D MMMM');

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Bonjour 👋</Text>
            <Text style={styles.businessName}>{merchant?.businessName}</Text>
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

        {/* Stats */}
        {loading ? (
          <ActivityIndicator color={Colors.primary} style={styles.loader} />
        ) : (
          <View style={styles.statsRow}>
            <StatCard label="Ventes aujourd'hui" value={formatAmount(stats?.totalAmount || 0)} icon="💵" color={Colors.primary} />
            <StatCard label="Transactions" value={String(stats?.completedCount || 0)} icon="✅" color={Colors.success} />
          </View>
        )}

        {/* Répartition providers */}
        {stats?.byProvider && Object.keys(stats.byProvider).length > 0 && (
          <Card style={styles.providerCard}>
            <Text style={styles.sectionTitle}>Répartition du jour</Text>
            {Object.entries(stats.byProvider).map(([provider, data]) => (
              <View key={provider} style={styles.providerRow}>
                <View style={[styles.providerDot, { backgroundColor: PROVIDER_COLORS[provider] || Colors.gray400 }]} />
                <Text style={styles.providerName}>{PROVIDER_LABELS[provider] || provider}</Text>
                <Text style={styles.providerAmount}>{formatAmount(data.amount)}</Text>
                <Text style={styles.providerCount}>({data.count})</Text>
              </View>
            ))}
          </Card>
        )}

        {/* Transactions récentes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Récentes</Text>
            <TouchableOpacity onPress={() => navigation.navigate('history')}>
              <Text style={styles.seeAll}>Tout voir</Text>
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

function StatCard({ label, value, icon, color }) {
  return (
    <Card style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

function TxRow({ tx, onPress }) {
  const icons = { wave: '🌊', orange_money: '🟠', cash: '💵' };
  return (
    <TouchableOpacity style={styles.txRow} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.txIcon, { backgroundColor: (PROVIDER_COLORS[tx.paymentProvider] || Colors.gray400) + '20' }]}>
        <Text style={styles.txIconText}>{icons[tx.paymentProvider] || '💳'}</Text>
      </View>
      <View style={styles.txInfo}>
        <Text style={styles.txProvider}>{PROVIDER_LABELS[tx.paymentProvider] || tx.paymentProvider}</Text>
        <Text style={styles.txTime}>{dayjs(tx.createdAt).format('HH:mm')}</Text>
      </View>
      <View style={styles.txRight}>
        <Text style={styles.txAmount}>{formatAmount(tx.amount)}</Text>
        <StatusBadge status={tx.paymentStatus} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: Spacing.lg, paddingTop: Spacing.xl },
  greeting: { fontSize: Typography.fontSizeMD, color: Colors.gray600 },
  businessName: { fontSize: Typography.fontSizeXL, fontWeight: Typography.fontWeightBold, color: Colors.gray900 },
  date: { fontSize: Typography.fontSizeSM, color: Colors.gray500, marginTop: 2, textTransform: 'capitalize' },
  avatarBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: Colors.white, fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold },
  cashButton: { margin: Spacing.lg, backgroundColor: Colors.primary, borderRadius: BorderRadius.xl, padding: Spacing.xl, alignItems: 'center', ...Shadows.lg },
  cashButtonIcon: { fontSize: 48, marginBottom: Spacing.sm },
  cashButtonText: { fontSize: Typography.fontSize3XL, fontWeight: Typography.fontWeightExtrabold, color: Colors.white },
  cashButtonSub: { fontSize: Typography.fontSizeMD, color: Colors.primaryBg, marginTop: 4 },
  loader: { marginVertical: Spacing.xl },
  statsRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: Spacing.md, marginBottom: Spacing.md },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: Spacing.lg },
  statIcon: { fontSize: 28, marginBottom: Spacing.sm },
  statValue: { fontSize: Typography.fontSizeXL, fontWeight: Typography.fontWeightExtrabold },
  statLabel: { fontSize: Typography.fontSizeSM, color: Colors.gray500, textAlign: 'center', marginTop: 2 },
  providerCard: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  providerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  providerDot: { width: 10, height: 10, borderRadius: 5, marginRight: Spacing.sm },
  providerName: { flex: 1, fontSize: Typography.fontSizeMD, color: Colors.gray700 },
  providerAmount: { fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightSemibold, color: Colors.gray900 },
  providerCount: { fontSize: Typography.fontSizeSM, color: Colors.gray500, marginLeft: 4 },
  section: { padding: Spacing.lg, paddingTop: 0 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  sectionTitle: { fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold, color: Colors.gray900 },
  seeAll: { fontSize: Typography.fontSizeMD, color: Colors.primary, fontWeight: Typography.fontWeightMedium },
  emptyCard: { alignItems: 'center', padding: Spacing.xl },
  emptyIcon: { fontSize: 36, marginBottom: Spacing.sm },
  emptyText: { fontSize: Typography.fontSizeMD, color: Colors.gray500, textAlign: 'center' },
  txRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.sm },
  txIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  txIconText: { fontSize: 22 },
  txInfo: { flex: 1 },
  txProvider: { fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightSemibold, color: Colors.gray900 },
  txTime: { fontSize: Typography.fontSizeSM, color: Colors.gray500 },
  txRight: { alignItems: 'flex-end', gap: 4 },
  txAmount: { fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold, color: Colors.gray900 },
});
