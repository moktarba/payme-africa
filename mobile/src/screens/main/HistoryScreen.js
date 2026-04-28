import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, RefreshControl, ActivityIndicator
} from 'react-native';
import { StatusBadge, EmptyState } from '../../components/ui';
import {
  Colors, Typography, Spacing, BorderRadius, Shadows,
  formatAmount, PROVIDER_LABELS, PROVIDER_COLORS
} from '../../utils/theme';
import { transactionApi } from '../../services/api';
import dayjs from 'dayjs';

const FILTERS = [
  { label: 'Tout', value: null },
  { label: 'Confirmé', value: 'completed' },
  { label: 'En attente', value: 'awaiting_confirmation' },
  { label: 'Annulé', value: 'cancelled' },
];
const LIMIT = 20;

export default function HistoryScreen({ navigation }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (reset = false) => {
    const currentOffset = reset ? 0 : offset;
    try {
      const res = await transactionApi.getHistory({ limit: LIMIT, offset: currentOffset, status: filter || undefined });
      const newTxs = res.data.transactions;
      if (reset) {
        setTransactions(newTxs);
        setOffset(LIMIT);
      } else {
        setTransactions((prev) => [...prev, ...newTxs]);
        setOffset(currentOffset + LIMIT);
      }
      setHasMore(newTxs.length === LIMIT);
    } catch (_) {}
    finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [filter, offset]);

  useEffect(() => { setLoading(true); setOffset(0); load(true); }, [filter]);

  const icons = { wave: '🌊', orange_money: '🟠', cash: '💵' };

  const renderItem = ({ item: tx }) => (
    <TouchableOpacity
      style={styles.txCard}
      onPress={() => navigation.navigate('transactionDetail', { transactionId: tx.id })}
      activeOpacity={0.85}
    >
      <View style={[styles.txIcon, { backgroundColor: (PROVIDER_COLORS[tx.paymentProvider] || Colors.gray400) + '20' }]}>
        <Text style={styles.txIconText}>{icons[tx.paymentProvider] || '💳'}</Text>
      </View>
      <View style={styles.txInfo}>
        <Text style={styles.txProvider}>{PROVIDER_LABELS[tx.paymentProvider] || tx.paymentProvider}</Text>
        {tx.note ? <Text style={styles.txNote} numberOfLines={1}>{tx.note}</Text> : null}
        <Text style={styles.txDate}>{dayjs(tx.createdAt).format('D MMM · HH:mm')}</Text>
      </View>
      <View style={styles.txRight}>
        <Text style={styles.txAmount}>{formatAmount(tx.amount)}</Text>
        <StatusBadge status={tx.paymentStatus} />
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.filters}>
      {FILTERS.map((f) => (
        <TouchableOpacity
          key={f.label}
          style={[styles.filterChip, filter === f.value && styles.filterChipActive]}
          onPress={() => setFilter(f.value)}
        >
          <Text style={[styles.filterText, filter === f.value && styles.filterTextActive]}>{f.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Historique</Text>
      </View>
      {loading ? (
        <ActivityIndicator color={Colors.primary} style={styles.loader} size="large" />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={<EmptyState icon="📋" title="Aucune transaction" subtitle="Vos transactions apparaîtront ici" />}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={Colors.primary} style={{ padding: Spacing.lg }} /> : null}
          onEndReached={() => { if (!hasMore || loadingMore) return; setLoadingMore(true); load(false); }}
          onEndReachedThreshold={0.5}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={Colors.primary} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { padding: Spacing.lg, paddingBottom: 0 },
  title: { fontSize: Typography.fontSize2XL, fontWeight: Typography.fontWeightExtrabold, color: Colors.gray900 },
  filters: { flexDirection: 'row', padding: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.md },
  filterChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightMedium, color: Colors.gray700 },
  filterTextActive: { color: Colors.white },
  loader: { marginTop: 60 },
  list: { padding: Spacing.lg, paddingTop: 0, flexGrow: 1 },
  txCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.sm },
  txIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  txIconText: { fontSize: 24 },
  txInfo: { flex: 1 },
  txProvider: { fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightSemibold, color: Colors.gray900 },
  txNote: { fontSize: Typography.fontSizeSM, color: Colors.gray500, marginTop: 1 },
  txDate: { fontSize: Typography.fontSizeSM, color: Colors.gray500, marginTop: 2 },
  txRight: { alignItems: 'flex-end', gap: 4 },
  txAmount: { fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold, color: Colors.gray900 },
});
