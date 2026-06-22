import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, RefreshControl, ActivityIndicator, TextInput
} from 'react-native';
import { StatusBadge, EmptyState } from '../../components/ui';
import {
  Colors, Typography, Spacing, BorderRadius, Shadows,
  formatAmount, PROVIDER_LABELS, PROVIDER_COLORS
} from '../../utils/theme';
import { transactionApi } from '../../services/api';
import dayjs from 'dayjs';

const STATUS_FILTERS = [
  { label: 'Tout',       value: null },
  { label: '✅ Confirmé', value: 'completed' },
  { label: '⏳ Attente', value: 'awaiting_confirmation' },
  { label: '❌ Annulé',  value: 'cancelled' },
];

const PROVIDER_FILTERS = [
  { label: 'Tous', value: null },
  { label: '🌊 Wave',   value: 'wave' },
  { label: '🟠 Orange', value: 'orange_money' },
  { label: '💵 Cash',   value: 'cash' },
  { label: '💳 PayDunya', value: 'paydunya' },
];

const LIMIT = 20;
const TX_ICONS = { wave: '🌊', orange_money: '🟠', cash: '💵', paydunya: '💳' };

export default function HistoryScreen({ navigation }) {
  const [transactions, setTransactions]   = useState([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [statusFilter, setStatusFilter]   = useState(null);
  const [providerFilter, setProviderFilter] = useState(null);
  const [search, setSearch]               = useState('');
  const [offset, setOffset]               = useState(0);
  const [hasMore, setHasMore]             = useState(true);
  const [loadingMore, setLoadingMore]     = useState(false);

  const load = useCallback(async (reset = false) => {
    const currentOffset = reset ? 0 : offset;
    try {
      const params = { limit: LIMIT, offset: currentOffset };
      if (statusFilter)   params.status   = statusFilter;
      if (providerFilter) params.provider = providerFilter;
      const res    = await transactionApi.getHistory(params);
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
  }, [statusFilter, providerFilter, offset]);

  useEffect(() => {
    setLoading(true);
    setOffset(0);
    load(true);
  }, [statusFilter, providerFilter]);

  // Recherche locale (note + montant)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter(tx =>
      (tx.note || '').toLowerCase().includes(q) ||
      String(tx.amount).includes(q) ||
      (PROVIDER_LABELS[tx.paymentProvider] || '').toLowerCase().includes(q)
    );
  }, [transactions, search]);

  // Total du filtre actuel
  const totalFiltered = useMemo(
    () => filtered.filter(tx => tx.paymentStatus === 'completed').reduce((s, tx) => s + tx.amount, 0),
    [filtered]
  );

  const renderItem = ({ item: tx }) => (
    <TouchableOpacity
      style={styles.txCard}
      onPress={() => navigation.navigate('transactionDetail', { transactionId: tx.id })}
      activeOpacity={0.85}
    >
      <View style={[styles.txIcon, { backgroundColor: (PROVIDER_COLORS[tx.paymentProvider] || Colors.gray400) + '20' }]}>
        <Text style={styles.txIconText}>{TX_ICONS[tx.paymentProvider] || '💳'}</Text>
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
    <View>
      {/* Barre de recherche */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="🔍 Rechercher (note, montant...)"
          placeholderTextColor={Colors.gray400}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Filtres statut */}
      <Text style={styles.filterLabel}>Statut</Text>
      <View style={styles.filters}>
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.label}
            style={[styles.filterChip, statusFilter === f.value && styles.filterChipActive]}
            onPress={() => setStatusFilter(f.value)}
          >
            <Text style={[styles.filterText, statusFilter === f.value && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Filtres provider */}
      <Text style={styles.filterLabel}>Mode de paiement</Text>
      <View style={styles.filters}>
        {PROVIDER_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.label}
            style={[styles.filterChip, providerFilter === f.value && styles.filterChipActive]}
            onPress={() => setProviderFilter(f.value)}
          >
            <Text style={[styles.filterText, providerFilter === f.value && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Total */}
      {filtered.length > 0 && (
        <View style={styles.totalBar}>
          <Text style={styles.totalCount}>{filtered.length} transaction(s)</Text>
          <Text style={styles.totalAmount}>Total confirmé : {formatAmount(totalFiltered)}</Text>
        </View>
      )}
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
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <EmptyState
              icon="📋"
              title={search ? 'Aucun résultat' : 'Aucune transaction'}
              subtitle={search ? 'Modifiez votre recherche' : 'Vos transactions apparaîtront ici'}
            />
          }
          ListFooterComponent={
            loadingMore
              ? <ActivityIndicator color={Colors.primary} style={{ padding: Spacing.lg }} />
              : hasMore && !search
              ? <TouchableOpacity style={styles.loadMoreBtn} onPress={() => { setLoadingMore(true); load(false); }}>
                  <Text style={styles.loadMoreText}>Charger plus</Text>
                </TouchableOpacity>
              : null
          }
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
  safe:        { flex: 1, backgroundColor: Colors.background },
  header:      { padding: Spacing.lg, paddingBottom: Spacing.sm },
  title:       { fontSize: Typography.fontSize2XL, fontWeight: Typography.fontWeightExtrabold, color: Colors.gray900 },
  loader:      { marginTop: 60 },
  list:        { padding: Spacing.lg, paddingTop: 0, flexGrow: 1 },

  searchRow:   { marginBottom: Spacing.sm },
  searchInput: { backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: Typography.fontSizeMD, color: Colors.gray900, ...Shadows.sm },

  filterLabel: { fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightSemibold, color: Colors.gray600, marginBottom: Spacing.xs, marginTop: Spacing.sm },
  filters:     { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
  filterChip:  { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.full, backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText:  { fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightMedium, color: Colors.gray700 },
  filterTextActive: { color: Colors.white },

  totalBar:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.primaryBg, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md },
  totalCount:  { fontSize: Typography.fontSizeSM, color: Colors.primary, fontWeight: Typography.fontWeightMedium },
  totalAmount: { fontSize: Typography.fontSizeSM, color: Colors.primary, fontWeight: Typography.fontWeightBold },

  txCard:      { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.sm },
  txIcon:      { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  txIconText:  { fontSize: 24 },
  txInfo:      { flex: 1 },
  txProvider:  { fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightSemibold, color: Colors.gray900 },
  txNote:      { fontSize: Typography.fontSizeSM, color: Colors.gray500, marginTop: 1 },
  txDate:      { fontSize: Typography.fontSizeSM, color: Colors.gray500, marginTop: 2 },
  txRight:     { alignItems: 'flex-end', gap: 4 },
  txAmount:    { fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold, color: Colors.gray900 },

  loadMoreBtn: { alignItems: 'center', padding: Spacing.lg },
  loadMoreText:{ fontSize: Typography.fontSizeMD, color: Colors.primary, fontWeight: Typography.fontWeightSemibold },
});
