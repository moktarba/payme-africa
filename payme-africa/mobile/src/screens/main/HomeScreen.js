import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { Colors, Spacing, formatAmount, PROVIDER_LABELS, PROVIDER_COLORS } from '../../utils/theme';
import { transactionApi, merchantApi } from '../../services/api';
import useStore from '../../store/useStore';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
dayjs.locale('fr');

export default function HomeScreen({ navigation }) {
  const merchant = useStore((s) => s.merchant);
  const { dayStats, setDayStats } = useStore();
  const [recentTxs, setRecentTxs] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [merchantData, setMerchantData] = useState(null);

  const load = useCallback(async (silent = false) => {
    try {
      const [statsRes, histRes, meRes] = await Promise.all([
        transactionApi.getDayStats().catch(() => null),
        transactionApi.getHistory({ limit: 5 }).catch(() => null),
        merchantApi.getMe().catch(() => null),
      ]);
      if (statsRes) setDayStats(statsRes.data.stats);
      if (histRes)  setRecentTxs(histRes.data.transactions || []);
      if (meRes)    setMerchantData(meRes.data.merchant);
    } catch (_) {}
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = dayStats;
  const name  = merchantData?.business_name || merchant?.businessName || '—';

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(true); }}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.greeting}>Bonjour 👋</Text>
            <Text style={s.bizName} numberOfLines={1}>{name}</Text>
            <Text style={s.date}>{dayjs().format('dddd D MMMM YYYY')}</Text>
          </View>
          <TouchableOpacity style={s.avatar} onPress={() => navigation.navigate('profile')}>
            <Text style={s.avatarTxt}>{name[0]?.toUpperCase() || 'M'}</Text>
          </TouchableOpacity>
        </View>

        {/* Bouton ENCAISSER */}
        <TouchableOpacity style={s.encaisserBtn} onPress={() => navigation.navigate('encaissement')} activeOpacity={0.88}>
          <View style={s.encaisserInner}>
            <Text style={s.encaisserIcon}>💰</Text>
            <View>
              <Text style={s.encaisserTitle}>Encaisser</Text>
              <Text style={s.encaisserSub}>Nouvelle transaction</Text>
            </View>
          </View>
          <Text style={s.encaisserArrow}>›</Text>
        </TouchableOpacity>

        {/* Accès rapide rapports */}
        <TouchableOpacity
          style={{marginHorizontal:16,marginBottom:12,flexDirection:'row',alignItems:'center',backgroundColor:Colors.white,borderRadius:14,padding:14,gap:12,shadowColor:'#000',shadowOffset:{width:0,height:1},shadowOpacity:0.05,shadowRadius:3,elevation:1}}
          onPress={() => navigation.navigate('reports')}
        >
          <Text style={{fontSize:22}}>📊</Text>
          <View style={{flex:1}}>
            <Text style={{fontSize:15,fontWeight:'700',color:Colors.gray900}}>Rapports & analytics</Text>
            <Text style={{fontSize:12,color:Colors.gray400,marginTop:1}}>Journalier · Hebdo · Mensuel</Text>
          </View>
          <Text style={{fontSize:18,color:Colors.gray300}}>›</Text>
        </TouchableOpacity>

    {/* Stats */}
        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ margin: 32 }} />
        ) : (
          <>
            <View style={s.statsRow}>
              <StatCard icon="💵" label="Ventes du jour"   value={formatAmount(stats?.totalAmount || 0)} color={Colors.primary} />
              <StatCard icon="✅" label="Confirmées"        value={String(stats?.completedCount || 0)}     color="#2D6A4F" />
              <StatCard icon="⏳" label="En attente"        value={String(stats?.pendingCount || 0)}       color="#856404" />
            </View>

            {/* Répartition par provider */}
            {stats?.byProvider && Object.keys(stats.byProvider).length > 0 && (
              <View style={s.section}>
                <Text style={s.sectionTitle}>Répartition du jour</Text>
                <View style={s.providerBox}>
                  {Object.entries(stats.byProvider).map(([p, d]) => (
                    <View key={p} style={s.providerRow}>
                      <View style={[s.dot, { backgroundColor: PROVIDER_COLORS[p] || Colors.gray400 }]} />
                      <Text style={s.providerName}>{PROVIDER_LABELS[p] || p}</Text>
                      <Text style={s.providerAmt}>{formatAmount(d.amount)}</Text>
                      <Text style={s.providerCnt}>× {d.count}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Transactions récentes */}
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Récentes</Text>
                <TouchableOpacity onPress={() => navigation.navigate('history')}>
                  <Text style={s.seeAll}>Tout voir →</Text>
                </TouchableOpacity>
              </View>
              {recentTxs.length === 0 ? (
                <View style={s.empty}>
                  <Text style={s.emptyIcon}>📋</Text>
                  <Text style={s.emptyTxt}>Aucune transaction aujourd'hui{'\n'}Appuyez sur Encaisser pour commencer</Text>
                </View>
              ) : (
                recentTxs.map((tx) => (
                  <TxRow key={tx.id} tx={tx}
                    onPress={() => navigation.navigate('transactionDetail', { transactionId: tx.id })} />
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <View style={sc.card}>
      <Text style={sc.icon}>{icon}</Text>
      <Text style={[sc.value, { color }]}>{value}</Text>
      <Text style={sc.label}>{label}</Text>
    </View>
  );
}

function TxRow({ tx, onPress }) {
  const icons = { wave: '🌊', orange_money: '🟠', cash: '💵', free_money: '🔴' };
  const statusColors = { completed: '#2D6A4F', awaiting_confirmation: '#856404', cancelled: Colors.gray500, failed: Colors.error };
  const statusLabels = { completed: 'Confirmé', awaiting_confirmation: 'En attente', cancelled: 'Annulé', failed: 'Échoué' };

  return (
    <TouchableOpacity style={tx_s.row} onPress={onPress} activeOpacity={0.8}>
      <View style={[tx_s.icon, { backgroundColor: (PROVIDER_COLORS[tx.paymentProvider] || Colors.gray200) + '22' }]}>
        <Text style={{ fontSize: 22 }}>{icons[tx.paymentProvider] || '💳'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={tx_s.provider}>{PROVIDER_LABELS[tx.paymentProvider] || tx.paymentProvider}</Text>
        {tx.note ? <Text style={tx_s.note} numberOfLines={1}>{tx.note}</Text> : null}
        <Text style={tx_s.time}>{dayjs(tx.createdAt).format('HH:mm')}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={tx_s.amount}>{formatAmount(tx.amount)}</Text>
        <View style={[tx_s.badge, { backgroundColor: (statusColors[tx.paymentStatus] || Colors.gray500) + '18' }]}>
          <Text style={[tx_s.badgeTxt, { color: statusColors[tx.paymentStatus] || Colors.gray500 }]}>
            {statusLabels[tx.paymentStatus] || tx.paymentStatus}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'flex-start', padding: 20, paddingTop: 24 },
  greeting: { fontSize: 14, color: Colors.gray500 },
  bizName: { fontSize: 20, fontWeight: '800', color: Colors.gray900, marginTop: 2 },
  date: { fontSize: 13, color: Colors.gray400, marginTop: 2, textTransform: 'capitalize' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
  avatarTxt: { color: Colors.white, fontSize: 18, fontWeight: '800' },

  encaisserBtn: { marginHorizontal: 16, marginBottom: 16, backgroundColor: Colors.primary, borderRadius: 18, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 },
  encaisserInner: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  encaisserIcon: { fontSize: 40 },
  encaisserTitle: { fontSize: 24, fontWeight: '800', color: Colors.white },
  encaisserSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  encaisserArrow: { fontSize: 32, color: 'rgba(255,255,255,0.5)', fontWeight: '300' },

  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 16 },

  section: { paddingHorizontal: 16, marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.gray900 },
  seeAll: { fontSize: 14, color: Colors.primary, fontWeight: '600' },

  providerBox: { backgroundColor: Colors.white, borderRadius: 14, padding: 14, gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  providerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  providerName: { flex: 1, fontSize: 15, color: Colors.gray700 },
  providerAmt: { fontSize: 15, fontWeight: '700', color: Colors.gray900 },
  providerCnt: { fontSize: 13, color: Colors.gray400, marginLeft: 4 },

  empty: { backgroundColor: Colors.white, borderRadius: 14, padding: 32, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyTxt: { fontSize: 15, color: Colors.gray500, textAlign: 'center', lineHeight: 22 },
});

const sc = StyleSheet.create({
  card: { flex: 1, backgroundColor: Colors.white, borderRadius: 14, padding: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  icon: { fontSize: 24, marginBottom: 6 },
  value: { fontSize: 20, fontWeight: '800', marginBottom: 2 },
  label: { fontSize: 11, color: Colors.gray400, textAlign: 'center' },
});

const tx_s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 14, padding: 14, marginBottom: 8, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  icon: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
  provider: { fontSize: 15, fontWeight: '700', color: Colors.gray900 },
  note: { fontSize: 13, color: Colors.gray400, marginTop: 1 },
  time: { fontSize: 12, color: Colors.gray400, marginTop: 2 },
  amount: { fontSize: 17, fontWeight: '800', color: Colors.gray900 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
});
