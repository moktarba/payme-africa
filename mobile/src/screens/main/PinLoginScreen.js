import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
  FlatList, Alert, ActivityIndicator,
} from 'react-native';
import { Colors, BorderRadius, Spacing, formatAmount } from '../../utils/theme';
import { employeeApi } from '../../services/api';
import useStore from '../../store/useStore';

const PIN_KEYS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

export default function PinLoginScreen({ navigation }) {
  const setEmployee = useStore((s) => s.setEmployee);
  const [employees,  setEmployees]  = useState([]);
  const [selected,   setSelected]   = useState(null);
  const [pin,        setPin]        = useState('');
  const [loading,    setLoading]    = useState(true);
  const [checking,   setChecking]   = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await employeeApi.list();
      setEmployees((res.data.employees || []).filter(e => e.is_active));
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleKey = (key) => {
    if (key === '⌫') { setPin(p => p.slice(0, -1)); return; }
    if (key === '')   return;
    if (pin.length >= 4) return;
    const next = pin + key;
    setPin(next);
    if (next.length === 4) handleLogin(next);
  };

  const handleLogin = async (code) => {
    if (!selected) { Alert.alert('Choisissez un employé'); setPin(''); return; }
    setChecking(true);
    try {
      const res = await employeeApi.loginPin(selected.id, code);
      // Stocker les infos employé dans le store si disponible
      if (setEmployee) setEmployee({ ...selected, sessionToken: res.data.token });
      Alert.alert(
        'Bienvenue !',
        `Connecté en tant que ${selected.name}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert('PIN incorrect', err.userMessage || 'Le PIN saisi est incorrect.');
      setPin('');
    } finally {
      setChecking(false);
    }
  };

  const ROLE_LABELS = { owner: 'Propriétaire', manager: 'Manager', cashier: 'Caissier' };

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← Retour</Text>
        </TouchableOpacity>
        <Text style={s.title}>Connexion employé</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Sélection employé */}
      <View style={s.section}>
        <Text style={s.label}>Qui êtes-vous ?</Text>
        {loading ? (
          <ActivityIndicator color={Colors.primary} />
        ) : employees.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyTxt}>Aucun employé actif. Ajoutez des employés dans la section Équipe.</Text>
          </View>
        ) : (
          <FlatList
            data={employees}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={e => e.id}
            contentContainerStyle={{ gap: 10, paddingRight: 16 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[s.empCard, selected?.id === item.id && s.empCardOn]}
                onPress={() => { setSelected(item); setPin(''); }}
              >
                <Text style={s.empIcon}>{item.role === 'manager' ? '👔' : '🧾'}</Text>
                <Text style={[s.empName, selected?.id === item.id && { color: Colors.primary }]}>
                  {item.name.split(' ')[0]}
                </Text>
                <Text style={s.empRole}>{ROLE_LABELS[item.role]}</Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {/* Saisie PIN */}
      {selected && (
        <>
          <View style={s.pinDisplay}>
            <Text style={s.pinName}>PIN pour {selected.name}</Text>
            <View style={s.dots}>
              {[0,1,2,3].map(i => (
                <View key={i} style={[s.dot, i < pin.length && s.dotFilled]} />
              ))}
            </View>
          </View>

          {checking ? (
            <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 40 }} />
          ) : (
            <View style={s.keypad}>
              {PIN_KEYS.map((key, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[s.key, key === '' && { opacity: 0 }]}
                  onPress={() => handleKey(key)}
                  disabled={key === ''}
                  activeOpacity={0.7}
                >
                  <Text style={s.keyTxt}>{key}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: Colors.background },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: Colors.white, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  back:       { fontSize: 15, color: Colors.primary, fontWeight: '600', width: 60 },
  title:      { fontSize: 18, fontWeight: '700', color: Colors.gray900 },
  section:    { padding: 16 },
  label:      { fontSize: 13, fontWeight: '600', color: Colors.gray500, marginBottom: 12 },
  empty:      { padding: 20, alignItems: 'center' },
  emptyTxt:   { fontSize: 14, color: Colors.gray400, textAlign: 'center' },
  empCard:    { width: 80, backgroundColor: Colors.white, borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 2, borderColor: Colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  empCardOn:  { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  empIcon:    { fontSize: 28, marginBottom: 6 },
  empName:    { fontSize: 12, fontWeight: '700', color: Colors.gray800, textAlign: 'center' },
  empRole:    { fontSize: 10, color: Colors.gray400, marginTop: 2, textAlign: 'center' },
  pinDisplay: { alignItems: 'center', paddingVertical: 24 },
  pinName:    { fontSize: 15, color: Colors.gray600, marginBottom: 16 },
  dots:       { flexDirection: 'row', gap: 16 },
  dot:        { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: Colors.gray300, backgroundColor: Colors.white },
  dotFilled:  { backgroundColor: Colors.primary, borderColor: Colors.primary },
  keypad:     { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 32, gap: 12, justifyContent: 'center' },
  key:        { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.white, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  keyTxt:     { fontSize: 26, fontWeight: '600', color: Colors.gray900 },
});
