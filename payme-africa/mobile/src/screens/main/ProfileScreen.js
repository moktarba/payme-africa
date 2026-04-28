import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, Switch,
} from 'react-native';
import { Colors, Spacing, PROVIDER_LABELS, PROVIDER_COLORS, formatAmount } from '../../utils/theme';
import { merchantApi, authApi, reportApi } from '../../services/api';
import { storage } from '../../utils/storage';
import useStore from '../../store/useStore';

const ICONS = { wave: '🌊', orange_money: '🟠', free_money: '🔴', cash: '💵' };

const MENU_ITEMS = [
  { icon: '📊', label: 'Rapports & analytics', route: 'reports', sub: 'Journalier · Hebdo · Mensuel' },
  { icon: '👥', label: 'Équipe & employés',    route: 'employees', sub: 'Gérer votre équipe' },
  { icon: '🔔', label: 'Notifications',         route: 'notifications', sub: 'Alertes & résumés' },
  { icon: '🗂️',  label: 'Catalogue articles',   route: 'catalog', sub: 'Gérer vos articles' },
  { icon: '📋', label: 'Historique',             route: 'history', sub: 'Toutes les transactions' },
];

export default function ProfileScreen({ navigation }) {
  const { merchant, logout } = useStore();
  const [methods, setMethods] = useState([]);
  const [weekStats, setWeekStats] = useState(null);

  useEffect(() => {
    merchantApi.getPaymentMethods()
      .then(r => setMethods(r.data.paymentMethods || []))
      .catch(() => {});
    reportApi.getWeek()
      .then(r => setWeekStats(r.data.report))
      .catch(() => {});
  }, []);

  const toggle = async (provider, current) => {
    setMethods(prev => prev.map(p => p.provider === provider ? { ...p, is_enabled: !current } : p));
    try { await merchantApi.updatePaymentMethod(provider, { isEnabled: !current }); }
    catch { setMethods(prev => prev.map(p => p.provider === provider ? { ...p, is_enabled: current } : p)); }
  };

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnecter', style: 'destructive',
        onPress: async () => {
          const rt = await storage.get('refreshToken');
          if (rt) await authApi.logout(rt).catch(() => {});
          await logout();
        },
      },
    ]);
  };

  const m = merchant || {};

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header commerçant */}
        <View style={s.heroCard}>
          <View style={s.avatarCircle}>
            <Text style={s.avatarTxt}>{m.businessName?.[0]?.toUpperCase() || 'M'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.bizName}>{m.businessName || '—'}</Text>
            {m.ownerName ? <Text style={s.sub}>{m.ownerName}</Text> : null}
            <Text style={s.sub}>{m.phone}</Text>
            {m.city ? <Text style={s.sub}>📍 {m.city}</Text> : null}
          </View>
        </View>

        {/* Stats semaine */}
        {weekStats && (
          <View style={s.statsRow}>
            <StatCard label="7 jours" value={formatAmount(weekStats.totals?.amount || 0)} color={Colors.primary} />
            <StatCard label="Transactions" value={String(weekStats.totals?.count || 0)} color="#059669" />
            <StatCard label="Meilleur jour" value={weekStats.bestDay?.label || '—'} color="#374151" />
          </View>
        )}

        {/* Menu rapide */}
        <SectionLabel label="Navigation rapide" />
        <View style={s.menuCard}>
          {MENU_ITEMS.map((item, i) => (
            <View key={item.route}>
              {i > 0 && <View style={s.sep} />}
              <TouchableOpacity style={s.menuRow} onPress={() => navigation.navigate(item.route)}>
                <Text style={s.menuIcon}>{item.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.menuLabel}>{item.label}</Text>
                  <Text style={s.menuSub}>{item.sub}</Text>
                </View>
                <Text style={s.menuArrow}>›</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Moyens de paiement */}
        <SectionLabel label="Moyens de paiement" />
        <View style={s.menuCard}>
          {methods.map((pm, i) => (
            <View key={pm.provider}>
              {i > 0 && <View style={s.sep} />}
              <View style={s.pmRow}>
                <View style={[s.pmIconBox, { backgroundColor: (PROVIDER_COLORS[pm.provider] || Colors.gray300) + '22' }]}>
                  <Text style={{ fontSize: 20 }}>{ICONS[pm.provider] || '💳'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.pmName}>{pm.display_name || PROVIDER_LABELS[pm.provider]}</Text>
                  <Text style={s.pmSub}>{pm.is_enabled ? '✅ Activé' : '⭕ Désactivé'}</Text>
                </View>
                <Switch
                  value={pm.is_enabled}
                  onValueChange={() => toggle(pm.provider, pm.is_enabled)}
                  trackColor={{ false: Colors.gray200, true: Colors.primary }}
                  thumbColor={Colors.white}
                />
              </View>
            </View>
          ))}
        </View>

        {/* Infos app */}
        <SectionLabel label="Application" />
        <View style={s.menuCard}>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Version</Text>
            <Text style={s.infoVal}>2.0.0 · Sprint 2</Text>
          </View>
          <View style={s.sep} />
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Devise</Text>
            <Text style={s.infoVal}>{m.currency || 'XOF'} — Franc CFA</Text>
          </View>
          <View style={s.sep} />
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Marché</Text>
            <Text style={s.infoVal}>🇸🇳 Sénégal</Text>
          </View>
        </View>

        <View style={s.logoutWrap}>
          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
            <Text style={s.logoutTxt}>Se déconnecter</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionLabel({ label }) {
  return (
    <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.gray400, textTransform: 'uppercase', letterSpacing: 0.5, marginHorizontal: 16, marginTop: 20, marginBottom: 8 }}>
      {label}
    </Text>
  );
}

function StatCard({ label, value, color }) {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.white, borderRadius: 12, padding: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 }}>
      <Text style={{ fontSize: 16, fontWeight: '800', color, marginBottom: 2 }}>{value}</Text>
      <Text style={{ fontSize: 10, color: Colors.gray400, textAlign: 'center' }}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  heroCard: { margin: 16, backgroundColor: Colors.white, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 3 },
  avatarCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarTxt: { color: Colors.white, fontSize: 22, fontWeight: '800' },
  bizName:  { fontSize: 17, fontWeight: '700', color: Colors.gray900 },
  sub:      { fontSize: 13, color: Colors.gray400, marginTop: 2 },
  statsRow: { flexDirection: 'row', marginHorizontal: 16, gap: 8, marginBottom: 4 },
  menuCard: { marginHorizontal: 16, backgroundColor: Colors.white, borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  menuRow:  { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  menuIcon: { fontSize: 22 },
  menuLabel:{ fontSize: 15, fontWeight: '600', color: Colors.gray900 },
  menuSub:  { fontSize: 12, color: Colors.gray400, marginTop: 1 },
  menuArrow:{ fontSize: 20, color: Colors.gray300 },
  sep:      { height: 0.5, backgroundColor: Colors.gray100, marginLeft: 14 },
  pmRow:    { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  pmIconBox:{ width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  pmName:   { fontSize: 15, fontWeight: '600', color: Colors.gray900 },
  pmSub:    { fontSize: 12, color: Colors.gray400, marginTop: 1 },
  infoRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  infoLabel:{ fontSize: 14, color: Colors.gray500 },
  infoVal:  { fontSize: 14, fontWeight: '600', color: Colors.gray900 },
  logoutWrap:{ margin: 16, marginTop: 20, marginBottom: 40 },
  logoutBtn: { borderRadius: 14, height: 52, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#fecaca', backgroundColor: '#fff5f5' },
  logoutTxt: { fontSize: 15, fontWeight: '700', color: '#dc2626' },
});
