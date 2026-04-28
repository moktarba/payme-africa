import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, RefreshControl, ActivityIndicator, TextInput,
} from 'react-native';
import { Colors, formatAmount, PROVIDER_LABELS, PROVIDER_COLORS } from '../../utils/theme';
import { transactionApi } from '../../services/api';
import dayjs from 'dayjs';

const FILTERS = [
  { label: 'Tout', value: null },
  { label: '✅ Confirmé', value: 'completed' },
  { label: '⏳ En attente', value: 'awaiting_confirmation' },
  { label: '❌ Annulé', value: 'cancelled' },
];
const ICONS    = { wave: '🌊', orange_money: '🟠', cash: '💵', free_money: '🔴' };
const ST_CLR   = { completed: '#059669', awaiting_confirmation: '#856404', cancelled: Colors.gray400, failed: Colors.error };
const ST_LBL   = { completed: 'Confirmé', awaiting_confirmation: 'En attente', cancelled: 'Annulé', failed: 'Échoué' };
const LIMIT = 20;

export default function HistoryScreen({ navigation }) {
  const [txs, setTxs]           = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter]     = useState(null);
  const [offset, setOffset]     = useState(0);
  const [hasMore, setHasMore]   = useState(true);
  const [search, setSearch]     = useState('');

  const load = useCallback(async (reset = false) => {
    const off = reset ? 0 : offset;
    try {
      const res = await transactionApi.getHistory({ limit: LIMIT, offset: off, status: filter || undefined });
      const data = res.data.transactions || [];
      if (reset) { setTxs(data); setOffset(LIMIT); }
      else { setTxs((p) => [...p, ...data]); setOffset(off + LIMIT); }
      setHasMore(data.length === LIMIT);
    } catch {}
    finally { setLoading(false); setRefreshing(false); setLoadingMore(false); }
  }, [filter, offset]);

  useEffect(() => { setLoading(true); setOffset(0); setHasMore(true); load(true); }, [filter]);

  const filtered = txs.filter((tx) =>
    !search ||
    PROVIDER_LABELS[tx.paymentProvider]?.toLowerCase().includes(search.toLowerCase()) ||
    (tx.note || '').toLowerCase().includes(search.toLowerCase()) ||
    String(tx.amount).includes(search)
  );

  const renderItem = ({ item: tx }) => {
    const color = PROVIDER_COLORS[tx.paymentProvider] || Colors.gray300;
    return (
      <TouchableOpacity
        style={ts.row}
        onPress={() => navigation.navigate('transactionDetail', { transactionId: tx.id })}
        activeOpacity={0.82}
      >
        <View style={[ts.icon, { backgroundColor: color + '22' }]}>
          <Text style={{ fontSize: 22 }}>{ICONS[tx.paymentProvider] || '💳'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={ts.provider}>{PROVIDER_LABELS[tx.paymentProvider] || tx.paymentProvider}</Text>
          {tx.note ? <Text style={ts.note} numberOfLines={1}>{tx.note}</Text> : null}
          <Text style={ts.date}>{dayjs(tx.createdAt).format('D MMM · HH:mm')}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={ts.amount}>{formatAmount(tx.amount)}</Text>
          <View style={[ts.badge, { backgroundColor: (ST_CLR[tx.paymentStatus] || Colors.gray400) + '18' }]}>
            <Text style={[ts.badgeTxt, { color: ST_CLR[tx.paymentStatus] || Colors.gray400 }]}>
              {ST_LBL[tx.paymentStatus] || tx.paymentStatus}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      <Text style={s.title}>Historique</Text>

      {/* Recherche */}
      <View style={s.searchWrap}>
        <TextInput
          style={s.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher..."
          placeholderTextColor={Colors.gray300}
        />
      </View>

      {/* Filtres */}
      <View style={s.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.label}
            style={[s.chip, filter === f.value && s.chipOn]}
            onPress={() => { setFilter(f.value); }}
          >
            <Text style={[s.chipTxt, filter === f.value && s.chipTxtOn]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 48 }} size="large" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(true); }}
              tintColor={Colors.primary}
            />
          }
          onEndReached={() => { if (hasMore && !loadingMore) { setLoadingMore(true); load(false); } }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={Colors.primary} style={{ padding: 16 }} /> : null}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>📋</Text>
              <Text style={{ fontSize: 17, fontWeight: '700', color: Colors.gray700, marginBottom: 6 }}>Aucune transaction</Text>
              <Text style={{ fontSize: 14, color: Colors.gray400, textAlign: 'center' }}>
                {filter ? 'Aucune transaction pour ce filtre.' : 'Vos transactions apparaîtront ici.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  title: { fontSize: 26, fontWeight: '800', color: Colors.gray900, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  searchWrap: { paddingHorizontal: 16, marginBottom: 8 },
  search: { backgroundColor: Colors.white, borderRadius: 12, padding: 12, fontSize: 15, color: Colors.gray900, borderWidth: 1, borderColor: Colors.border },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 4, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border },
  chipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipTxt: { fontSize: 13, fontWeight: '600', color: Colors.gray600 },
  chipTxtOn: { color: Colors.white },
});

const ts = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 14, padding: 14, marginBottom: 8, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  icon: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
  provider: { fontSize: 15, fontWeight: '700', color: Colors.gray900 },
  note: { fontSize: 13, color: Colors.gray400, marginTop: 1 },
  date: { fontSize: 12, color: Colors.gray400, marginTop: 2 },
  amount: { fontSize: 17, fontWeight: '800', color: Colors.gray900 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
});
