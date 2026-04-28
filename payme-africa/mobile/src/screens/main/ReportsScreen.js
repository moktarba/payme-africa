import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, Share,
} from 'react-native';
import { Colors, formatAmount, PROVIDER_LABELS, PROVIDER_COLORS } from '../../utils/theme';
import { reportApi } from '../../services/api';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
dayjs.locale('fr');

const TABS = [
  { key: 'day',   label: 'Aujourd\'hui' },
  { key: 'week',  label: '7 jours' },
  { key: 'month', label: 'Ce mois' },
];

export default function ReportsScreen({ navigation }) {
  const [tab, setTab]         = useState('day');
  const [data, setData]       = useState(null);
  const [topItems, setTopItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [reportRes, itemsRes] = await Promise.all([
        tab === 'day'   ? reportApi.getDay()   :
        tab === 'week'  ? reportApi.getWeek()  :
        reportApi.getMonth(),
        reportApi.getTopItems(5),
      ]);
      setData(reportRes.data.report);
      setTopItems(itemsRes.data.items || []);
    } catch (err) {
      Alert.alert('Erreur', err.userMessage || 'Impossible de charger le rapport.');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const handleExport = async () => {
    try {
      await Share.share({
        message: buildShareText(data, tab),
        title: 'Rapport PayMe Africa',
      });
    } catch {}
  };

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← Retour</Text>
        </TouchableOpacity>
        <Text style={s.title}>Rapports</Text>
        <TouchableOpacity onPress={handleExport}>
          <Text style={s.exportBtn}>📤</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={s.tabRow}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[s.tab, tab === t.key && s.tabOn]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[s.tabTxt, tab === t.key && s.tabTxtOn]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} size="large" style={{ flex: 1 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {tab === 'day'  && data && <DayView  data={data} />}
          {tab === 'week' && data && <WeekView data={data} />}
          {tab === 'month'&& data && <MonthView data={data} />}

          {/* Top articles */}
          {topItems.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>🏆 Articles les plus vendus</Text>
              <View style={s.card}>
                {topItems.map((item, i) => (
                  <View key={i}>
                    {i > 0 && <View style={s.sep} />}
                    <View style={s.itemRow}>
                      <View style={[s.rank, i < 3 && { backgroundColor: ['#FFD700','#C0C0C0','#CD7F32'][i] }]}>
                        <Text style={s.rankTxt}>{i + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.itemName}>{item.name}</Text>
                        <Text style={s.itemSub}>{item.qty} vendus</Text>
                      </View>
                      <Text style={s.itemRev}>{formatAmount(item.revenue)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ── VUE JOURNALIÈRE ────────────────────────────────────────────────
function DayView({ data }) {
  const maxHour = data.byHour?.reduce((m, h) => h.amount > m.amount ? h : m, { amount: 0, hour: 0 });
  return (
    <View>
      {/* KPIs */}
      <View style={kpi.row}>
        <KpiCard icon="💵" label="Total du jour"    value={formatAmount(data.totalAmount)} big color={Colors.primary} />
      </View>
      <View style={kpi.row}>
        <KpiCard icon="✅" label="Confirmées"  value={data.completedCount} color="#059669" />
        <KpiCard icon="⏳" label="En attente"  value={data.pendingCount}   color="#856404" />
        <KpiCard icon="❌" label="Annulées"    value={data.cancelledCount} color="#9ca3af" />
      </View>
      {data.avgAmount > 0 && (
        <View style={kpi.row}>
          <KpiCard icon="📊" label="Panier moyen" value={formatAmount(data.avgAmount)} color="#374151" />
          <KpiCard icon="🏆" label="Meilleure vente" value={formatAmount(data.maxAmount)} color="#374151" />
        </View>
      )}

      {/* Répartition par provider */}
      {Object.keys(data.byProvider).length > 0 && (
        <Section title="Répartition par mode">
          {Object.entries(data.byProvider).map(([p, d]) => (
            <ProviderBar key={p} provider={p} data={d} total={data.totalAmount} />
          ))}
        </Section>
      )}

      {/* Activité par heure */}
      {data.byHour?.length > 0 && (
        <Section title={`Activité horaire · Pic: ${String(maxHour.hour).padStart(2,'0')}h`}>
          <HourChart hours={data.byHour} />
        </Section>
      )}
    </View>
  );
}

// ── VUE HEBDOMADAIRE ───────────────────────────────────────────────
function WeekView({ data }) {
  const max = Math.max(...data.series.map(d => d.amount), 1);
  return (
    <View>
      <View style={kpi.row}>
        <KpiCard icon="💵" label="7 jours" value={formatAmount(data.totals.amount)} big color={Colors.primary} />
      </View>
      <View style={kpi.row}>
        <KpiCard icon="✅" label="Transactions" value={data.totals.count}               color="#059669" />
        <KpiCard icon="🏆" label="Meilleur jour" value={data.bestDay?.label || '—'}    color="#374151" />
      </View>

      <Section title="Ventes par jour">
        <View style={{ gap: 8 }}>
          {data.series.map((day, i) => (
            <View key={i} style={bar.row}>
              <Text style={bar.label}>{day.label}</Text>
              <View style={bar.track}>
                <View style={[bar.fill, {
                  width: `${Math.round((day.amount / max) * 100)}%`,
                  backgroundColor: day.amount === data.bestDay?.amount ? Colors.primary : Colors.primaryBg,
                }]} />
              </View>
              <Text style={bar.value}>{day.amount > 0 ? formatAmount(day.amount) : '—'}</Text>
            </View>
          ))}
        </View>
      </Section>
    </View>
  );
}

// ── VUE MENSUELLE ──────────────────────────────────────────────────
function MonthView({ data }) {
  return (
    <View>
      <View style={kpi.row}>
        <KpiCard icon="💵" label={data.label} value={formatAmount(data.total.amount)} big color={Colors.primary} />
      </View>
      <View style={kpi.row}>
        <KpiCard icon="✅" label="Transactions" value={data.total.count} color="#059669" />
        <KpiCard icon="📊" label="Semaines actives" value={data.weekSeries?.length || 0} color="#374151" />
      </View>

      {data.weekSeries?.length > 0 && (
        <Section title="Par semaine">
          {data.weekSeries.map((w, i) => (
            <View key={i} style={s.weekRow}>
              <Text style={s.weekLabel}>Semaine {i + 1}</Text>
              <Text style={s.weekCount}>{w.count} ventes</Text>
              <Text style={s.weekAmt}>{formatAmount(w.amount)}</Text>
            </View>
          ))}
        </Section>
      )}
    </View>
  );
}

// ── COMPOSANTS UTILITAIRES ─────────────────────────────────────────
function KpiCard({ icon, label, value, color, big }) {
  return (
    <View style={[kpi.card, big && kpi.cardBig]}>
      <Text style={kpi.icon}>{icon}</Text>
      <Text style={[kpi.value, { color }, big && kpi.valueBig]}>{value}</Text>
      <Text style={kpi.label}>{label}</Text>
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.card}>{children}</View>
    </View>
  );
}

function ProviderBar({ provider, data, total }) {
  const pct = total > 0 ? Math.round((data.amount / total) * 100) : 0;
  const color = PROVIDER_COLORS[provider] || Colors.gray400;
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.gray800 }}>
          {PROVIDER_LABELS[provider] || provider} ({data.count})
        </Text>
        <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.gray900 }}>{formatAmount(data.amount)}</Text>
      </View>
      <View style={{ height: 8, backgroundColor: Colors.gray100, borderRadius: 4, overflow: 'hidden' }}>
        <View style={{ height: 8, width: `${pct}%`, backgroundColor: color, borderRadius: 4 }} />
      </View>
      <Text style={{ fontSize: 11, color: Colors.gray400, marginTop: 2 }}>{pct}% du total</Text>
    </View>
  );
}

function HourChart({ hours }) {
  const max = Math.max(...hours.map(h => h.amount), 1);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, paddingBottom: 4 }}>
        {hours.map((h, i) => (
          <View key={i} style={{ alignItems: 'center', width: 36 }}>
            <Text style={{ fontSize: 10, color: Colors.gray400, marginBottom: 4 }}>{formatAmount(h.amount)}</Text>
            <View style={{
              width: 28, height: Math.max(8, Math.round((h.amount / max) * 80)),
              backgroundColor: Colors.primary, borderRadius: 4,
            }} />
            <Text style={{ fontSize: 10, color: Colors.gray500, marginTop: 4 }}>{String(h.hour).padStart(2,'0')}h</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function buildShareText(data, tab) {
  if (!data) return 'Rapport PayMe Africa';
  if (tab === 'day') {
    return `📊 Rapport PayMe Africa - Aujourd'hui\n` +
      `Total : ${formatAmount(data.totalAmount)}\n` +
      `Confirmées : ${data.completedCount} transactions\n` +
      `Panier moyen : ${formatAmount(data.avgAmount)}`;
  }
  if (tab === 'week') {
    return `📊 Rapport PayMe Africa - 7 derniers jours\n` +
      `Total : ${formatAmount(data.totals?.amount || 0)}\n` +
      `Transactions : ${data.totals?.count || 0}`;
  }
  return `📊 Rapport PayMe Africa - ${data.label}\nTotal : ${formatAmount(data.total?.amount || 0)}`;
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: Colors.white, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  back:   { fontSize: 15, color: Colors.primary, fontWeight: '600' },
  title:  { fontSize: 18, fontWeight: '700', color: Colors.gray900 },
  exportBtn: { fontSize: 22 },
  tabRow: { flexDirection: 'row', backgroundColor: Colors.white, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  tab:    { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabOn:  { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabTxt: { fontSize: 14, color: Colors.gray400, fontWeight: '500' },
  tabTxtOn: { color: Colors.primary, fontWeight: '700' },
  section: { padding: 16, paddingBottom: 0 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.gray900, marginBottom: 10 },
  card:   { backgroundColor: Colors.white, borderRadius: 14, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sep:    { height: 0.5, backgroundColor: Colors.gray100, marginVertical: 4 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 },
  rank:   { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.gray100, justifyContent: 'center', alignItems: 'center' },
  rankTxt: { fontSize: 13, fontWeight: '700', color: Colors.gray700 },
  itemName: { fontSize: 14, fontWeight: '600', color: Colors.gray900 },
  itemSub:  { fontSize: 12, color: Colors.gray400, marginTop: 1 },
  itemRev:  { fontSize: 14, fontWeight: '800', color: Colors.primary },
  weekRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: Colors.gray100 },
  weekLabel: { flex: 1, fontSize: 14, color: Colors.gray600 },
  weekCount: { fontSize: 13, color: Colors.gray400, marginRight: 12 },
  weekAmt:   { fontSize: 14, fontWeight: '700', color: Colors.gray900 },
});

const kpi = StyleSheet.create({
  row:      { flexDirection: 'row', padding: 16, paddingBottom: 0, gap: 10 },
  card:     { flex: 1, backgroundColor: Colors.white, borderRadius: 14, padding: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  cardBig:  { paddingVertical: 16 },
  icon:     { fontSize: 22, marginBottom: 6 },
  value:    { fontSize: 18, fontWeight: '800', marginBottom: 2 },
  valueBig: { fontSize: 26 },
  label:    { fontSize: 11, color: Colors.gray400, textAlign: 'center' },
});

const bar = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { width: 32, fontSize: 13, color: Colors.gray500, fontWeight: '600' },
  track: { flex: 1, height: 20, backgroundColor: Colors.gray100, borderRadius: 6, overflow: 'hidden' },
  fill:  { height: 20, borderRadius: 6 },
  value: { width: 80, fontSize: 13, fontWeight: '700', color: Colors.gray900, textAlign: 'right' },
});
