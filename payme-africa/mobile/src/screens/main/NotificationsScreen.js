import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, RefreshControl, Alert,
} from 'react-native';
import { Colors, Spacing, BorderRadius } from '../../utils/theme';
import { notificationApi } from '../../services/api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/fr';
dayjs.extend(relativeTime);
dayjs.locale('fr');

const TYPE_CONFIG = {
  transaction_confirmed: { icon: '✅', color: '#059669', bg: '#D1FAE5', label: 'Paiement' },
  transaction_pending:   { icon: '⏳', color: '#856404', bg: '#FEF3C7', label: 'Attente' },
  daily_summary:         { icon: '📊', color: Colors.primary, bg: Colors.primaryBg, label: 'Résumé' },
  employee_login:        { icon: '👤', color: '#185FA5', bg: '#DBEAFE', label: 'Équipe' },
  employee_limit:        { icon: '⚠️', color: '#dc2626', bg: '#FEE2E2', label: 'Limite' },
};

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);

  const load = useCallback(async (silent = false) => {
    try {
      const res = await notificationApi.list({ limit: 30 });
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleMarkAll = async () => {
    try {
      await notificationApi.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const handleMarkOne = async (id) => {
    try {
      await notificationApi.markRead([id]);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {}
  };

  const renderItem = ({ item: notif }) => {
    const cfg = TYPE_CONFIG[notif.type] || { icon: '🔔', color: Colors.gray500, bg: Colors.gray100, label: 'Info' };
    return (
      <TouchableOpacity
        style={[s.notifCard, !notif.is_read && s.notifUnread]}
        onPress={() => handleMarkOne(notif.id)}
        activeOpacity={0.8}
      >
        <View style={[s.notifIcon, { backgroundColor: cfg.bg }]}>
          <Text style={{ fontSize: 18 }}>{cfg.icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <Text style={[s.notifTitle, !notif.is_read && s.notifTitleUnread]}>
              {notif.title}
            </Text>
            {!notif.is_read && <View style={[s.unreadDot, { backgroundColor: cfg.color }]} />}
          </View>
          <Text style={s.notifBody} numberOfLines={2}>{notif.body}</Text>
          <Text style={s.notifTime}>{dayjs(notif.created_at).fromNow()}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← Retour</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={s.title}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeTxt}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={handleMarkAll}>
            <Text style={s.markAll}>Tout lire</Text>
          </TouchableOpacity>
        ) : <View style={{ width: 60 }} />}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🔔</Text>
            <Text style={s.emptyTitle}>Pas de notifications</Text>
            <Text style={s.emptyText}>Vos alertes de paiement et résumés apparaîtront ici.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: Colors.white, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  back: { fontSize: 15, color: Colors.primary, fontWeight: '600', width: 60 },
  title: { fontSize: 18, fontWeight: '700', color: Colors.gray900 },
  markAll: { fontSize: 13, color: Colors.primary, fontWeight: '600', width: 60, textAlign: 'right' },
  badge: { backgroundColor: Colors.primary, borderRadius: 99, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  badgeTxt: { fontSize: 11, fontWeight: '800', color: Colors.white },
  notifCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: Colors.white, borderRadius: 14, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  notifUnread: { borderLeftWidth: 3, borderLeftColor: Colors.primary, backgroundColor: Colors.primaryBg + '44' },
  notifIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  notifTitle: { fontSize: 14, fontWeight: '500', color: Colors.gray700, flex: 1 },
  notifTitleUnread: { fontWeight: '700', color: Colors.gray900 },
  unreadDot: { width: 7, height: 7, borderRadius: 3.5 },
  notifBody: { fontSize: 13, color: Colors.gray500, lineHeight: 18, marginBottom: 4 },
  notifTime: { fontSize: 11, color: Colors.gray400 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.gray700, marginBottom: 6 },
  emptyText: { fontSize: 14, color: Colors.gray400, textAlign: 'center', lineHeight: 20 },
});
