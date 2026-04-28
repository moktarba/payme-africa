import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, FlatList,
  TouchableOpacity, TextInput, Alert, Modal, Platform,
} from 'react-native';
import { Colors, Spacing, BorderRadius, formatAmount } from '../../utils/theme';
import { employeeApi } from '../../services/api';

const ROLE_LABELS = { owner: 'Propriétaire', manager: 'Manager', cashier: 'Caissier' };
const ROLE_COLORS = { owner: Colors.primary, manager: '#185FA5', cashier: '#6b7280' };

export default function EmployeesScreen({ navigation }) {
  const [employees, setEmployees] = useState([]);
  const [stats,     setStats]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(false);
  const [pinModal,  setPinModal]  = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [activeEmp, setActiveEmp] = useState(null);
  const [form, setForm] = useState({ name:'', phone:'', role:'cashier', pin:'', dailyLimit:'' });
  const [pinForm, setPinForm] = useState({ pin:'', confirm:'' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [empRes, statRes] = await Promise.all([
        employeeApi.list(),
        employeeApi.getStats(),
      ]);
      setEmployees(empRes.data.employees || []);
      setStats(statRes.data.stats || []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name:'', phone:'', role:'cashier', pin:'', dailyLimit:'' });
    setModal(true);
  };

  const openEdit = (emp) => {
    setEditing(emp);
    setForm({ name: emp.name, phone: emp.phone||'', role: emp.role, pin:'', dailyLimit: emp.daily_limit ? String(emp.daily_limit) : '' });
    setModal(true);
  };

  const openPin = (emp) => {
    setActiveEmp(emp);
    setPinForm({ pin:'', confirm:'' });
    setPinModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Erreur', 'Le nom est requis.'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        role: form.role,
        pin: form.pin || undefined,
        dailyLimit: form.dailyLimit ? parseInt(form.dailyLimit) : undefined,
      };
      if (editing) await employeeApi.update(editing.id, payload);
      else await employeeApi.create(payload);
      setModal(false);
      load();
    } catch (err) {
      Alert.alert('Erreur', err.userMessage || 'Impossible de sauvegarder.');
    } finally { setSaving(false); }
  };

  const handleSetPin = async () => {
    if (pinForm.pin.length !== 4) { Alert.alert('Erreur', 'Le PIN doit avoir 4 chiffres.'); return; }
    if (pinForm.pin !== pinForm.confirm) { Alert.alert('Erreur', 'Les PIN ne correspondent pas.'); return; }
    try {
      await employeeApi.setPin(activeEmp.id, pinForm.pin);
      setPinModal(false);
      Alert.alert('Succès', `PIN défini pour ${activeEmp.name}.`);
    } catch (err) {
      Alert.alert('Erreur', err.userMessage || 'Impossible de définir le PIN.');
    }
  };

  const handleDeactivate = (emp) => {
    Alert.alert('Désactiver', `Désactiver ${emp.name} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Désactiver', style: 'destructive',
        onPress: async () => {
          try { await employeeApi.deactivate(emp.id); load(); }
          catch (err) { Alert.alert('Erreur', err.userMessage); }
        },
      },
    ]);
  };

  const statFor = (id) => stats.find(s => s.id === id);

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.back}>← Retour</Text>
        </TouchableOpacity>
        <Text style={s.title}>Équipe</Text>
        <TouchableOpacity style={s.addBtn} onPress={openCreate}>
          <Text style={s.addBtnTxt}>+ Ajouter</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Stats rapides */}
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statVal}>{employees.length}</Text>
            <Text style={s.statLbl}>Employés actifs</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statVal, { color: Colors.primary }]}>
              {formatAmount(stats.reduce((sum, e) => sum + e.totalAmount, 0))}
            </Text>
            <Text style={s.statLbl}>Ventes équipe</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statVal, { color: '#185FA5' }]}>
              {stats.reduce((sum, e) => sum + e.txCount, 0)}
            </Text>
            <Text style={s.statLbl}>Transactions</Text>
          </View>
        </View>

        {/* Liste employés */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Membres de l'équipe</Text>
          {loading ? (
            <Text style={{ color: Colors.gray400, padding: 20, textAlign: 'center' }}>Chargement...</Text>
          ) : employees.length === 0 ? (
            <View style={s.emptyCard}>
              <Text style={s.emptyIcon}>👥</Text>
              <Text style={s.emptyTitle}>Aucun employé</Text>
              <Text style={s.emptyText}>Ajoutez votre premier employé pour qu'il puisse encaisser à votre place.</Text>
              <TouchableOpacity style={s.emptyBtn} onPress={openCreate}>
                <Text style={s.emptyBtnTxt}>+ Ajouter un employé</Text>
              </TouchableOpacity>
            </View>
          ) : (
            employees.map((emp) => {
              const st = statFor(emp.id);
              return (
                <View key={emp.id} style={s.empCard}>
                  <View style={s.empRow}>
                    <View style={[s.avatar, { backgroundColor: ROLE_COLORS[emp.role] + '22' }]}>
                      <Text style={{ fontSize: 18 }}>
                        {emp.role === 'manager' ? '👔' : '🧾'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={s.empName}>{emp.name}</Text>
                        <View style={[s.roleBadge, { backgroundColor: ROLE_COLORS[emp.role] + '18' }]}>
                          <Text style={[s.roleTxt, { color: ROLE_COLORS[emp.role] }]}>
                            {ROLE_LABELS[emp.role]}
                          </Text>
                        </View>
                      </View>
                      {emp.phone && <Text style={s.empPhone}>{emp.phone}</Text>}
                      {emp.daily_limit && (
                        <Text style={s.empLimit}>Limite : {formatAmount(emp.daily_limit)}/jour</Text>
                      )}
                    </View>
                  </View>

                  {/* Stats du jour */}
                  {st && (
                    <View style={s.empStats}>
                      <Text style={s.empStatTxt}>Aujourd'hui : </Text>
                      <Text style={s.empStatVal}>{formatAmount(st.totalAmount)}</Text>
                      <Text style={s.empStatTxt}> · {st.txCount} vente{st.txCount > 1 ? 's' : ''}</Text>
                    </View>
                  )}

                  {/* Actions */}
                  <View style={s.empActions}>
                    <TouchableOpacity style={s.actionBtn} onPress={() => openEdit(emp)}>
                      <Text style={s.actionTxt}>✏️ Modifier</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.actionBtn} onPress={() => openPin(emp)}>
                      <Text style={s.actionTxt}>🔑 PIN</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.actionBtn, s.actionDanger]} onPress={() => handleDeactivate(emp)}>
                      <Text style={s.actionDangerTxt}>🚫 Désactiver</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Rôles expliqués */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Niveaux d'accès</Text>
          <View style={s.rolesCard}>
            {[
              { role: 'manager', label: 'Manager', desc: 'Peut encaisser, voir les rapports et gérer le catalogue' },
              { role: 'cashier', label: 'Caissier', desc: 'Peut uniquement encaisser des clients' },
            ].map((r) => (
              <View key={r.role} style={s.roleRow}>
                <View style={[s.roleIcon, { backgroundColor: ROLE_COLORS[r.role] + '18' }]}>
                  <Text style={{ color: ROLE_COLORS[r.role], fontSize: 13, fontWeight: '700' }}>
                    {r.role === 'manager' ? 'M' : 'C'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.roleLabel}>{r.label}</Text>
                  <Text style={s.roleDesc}>{r.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Modal création/édition */}
      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <View style={s.modalBg} onTouchEnd={() => setModal(false)}>
          <View style={s.modalBox} onTouchEnd={e => e.stopPropagation()}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editing ? 'Modifier' : 'Ajouter un employé'}</Text>
              <TouchableOpacity onPress={() => setModal(false)}>
                <Text style={{ fontSize: 20, color: Colors.gray400 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.fieldLabel}>Nom *</Text>
            <TextInput style={s.field} value={form.name} onChangeText={v => setForm({ ...form, name: v })} placeholder="Ex: Fatou Sow" />

            <Text style={s.fieldLabel}>Téléphone</Text>
            <TextInput style={s.field} value={form.phone} onChangeText={v => setForm({ ...form, phone: v })} placeholder="+221 77 000 00 00" keyboardType="phone-pad" />

            <Text style={s.fieldLabel}>Rôle</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {['cashier', 'manager'].map(r => (
                <TouchableOpacity
                  key={r}
                  style={[s.roleChip, form.role === r && s.roleChipOn]}
                  onPress={() => setForm({ ...form, role: r })}
                >
                  <Text style={[s.roleChipTxt, form.role === r && s.roleChipTxtOn]}>
                    {ROLE_LABELS[r]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.fieldLabel}>PIN de connexion (4 chiffres)</Text>
            <TextInput style={s.field} value={form.pin} onChangeText={v => setForm({ ...form, pin: v.replace(/\D/g,'').slice(0,4) })} placeholder="Ex: 1234" keyboardType="number-pad" secureTextEntry maxLength={4} />

            <Text style={s.fieldLabel}>Limite journalière (FCFA, optionnel)</Text>
            <TextInput style={s.field} value={form.dailyLimit} onChangeText={v => setForm({ ...form, dailyLimit: v.replace(/\D/g,'') })} placeholder="Ex: 50000" keyboardType="number-pad" />

            <TouchableOpacity
              style={[s.saveBtn, saving && { opacity: 0.5 }]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={s.saveBtnTxt}>{saving ? 'Enregistrement...' : (editing ? 'Modifier' : 'Ajouter')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal PIN */}
      <Modal visible={pinModal} animationType="slide" transparent onRequestClose={() => setPinModal(false)}>
        <View style={s.modalBg}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>PIN pour {activeEmp?.name}</Text>
              <TouchableOpacity onPress={() => setPinModal(false)}>
                <Text style={{ fontSize: 20, color: Colors.gray400 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={s.fieldLabel}>Nouveau PIN (4 chiffres)</Text>
            <TextInput style={s.field} value={pinForm.pin} onChangeText={v => setPinForm({ ...pinForm, pin: v.replace(/\D/g,'').slice(0,4) })} keyboardType="number-pad" secureTextEntry maxLength={4} placeholder="••••" />
            <Text style={s.fieldLabel}>Confirmer le PIN</Text>
            <TextInput style={s.field} value={pinForm.confirm} onChangeText={v => setPinForm({ ...pinForm, confirm: v.replace(/\D/g,'').slice(0,4) })} keyboardType="number-pad" secureTextEntry maxLength={4} placeholder="••••" />
            <TouchableOpacity style={s.saveBtn} onPress={handleSetPin}>
              <Text style={s.saveBtnTxt}>Définir le PIN</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: Colors.white, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  back: { fontSize: 15, color: Colors.primary, fontWeight: '600' },
  title: { fontSize: 18, fontWeight: '700', color: Colors.gray900 },
  addBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  addBtnTxt: { fontSize: 13, fontWeight: '700', color: Colors.white },
  statsRow: { flexDirection: 'row', padding: 16, gap: 8 },
  statCard: { flex: 1, backgroundColor: Colors.white, borderRadius: 12, padding: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  statVal: { fontSize: 18, fontWeight: '800', color: Colors.gray900, marginBottom: 2 },
  statLbl: { fontSize: 10, color: Colors.gray400, textAlign: 'center' },
  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.gray900, marginBottom: 10 },
  emptyCard: { backgroundColor: Colors.white, borderRadius: 14, padding: 32, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.gray900, marginBottom: 6 },
  emptyText: { fontSize: 14, color: Colors.gray400, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  emptyBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10 },
  emptyBtnTxt: { fontSize: 14, fontWeight: '700', color: Colors.white },
  empCard: { backgroundColor: Colors.white, borderRadius: 14, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  empRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  empName: { fontSize: 15, fontWeight: '700', color: Colors.gray900 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 99 },
  roleTxt: { fontSize: 11, fontWeight: '700' },
  empPhone: { fontSize: 12, color: Colors.gray400, marginTop: 2 },
  empLimit: { fontSize: 11, color: Colors.gray400, marginTop: 2 },
  empStats: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background, borderRadius: 8, padding: 8, marginBottom: 10 },
  empStatTxt: { fontSize: 12, color: Colors.gray500 },
  empStatVal: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  empActions: { flexDirection: 'row', gap: 6 },
  actionBtn: { flex: 1, paddingVertical: 7, borderRadius: 8, backgroundColor: Colors.gray50, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  actionTxt: { fontSize: 12, color: Colors.gray700, fontWeight: '500' },
  actionDanger: { backgroundColor: '#fff5f5', borderColor: '#fecaca' },
  actionDangerTxt: { fontSize: 12, color: '#dc2626', fontWeight: '500' },
  rolesCard: { backgroundColor: Colors.white, borderRadius: 14, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 0.5, borderBottomColor: Colors.gray100 },
  roleIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  roleLabel: { fontSize: 14, fontWeight: '700', color: Colors.gray900 },
  roleDesc: { fontSize: 12, color: Colors.gray400, marginTop: 2 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,.45)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: Colors.white, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 22, paddingBottom: Platform.OS === 'ios' ? 38 : 22 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.gray900 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.gray600, marginBottom: 6, marginTop: 8 },
  field: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10, padding: 12, fontSize: 15, color: Colors.gray900, backgroundColor: Colors.gray50 },
  roleChip: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center' },
  roleChipOn: { backgroundColor: Colors.primaryBg, borderColor: Colors.primary },
  roleChipTxt: { fontSize: 14, fontWeight: '600', color: Colors.gray600 },
  roleChipTxtOn: { color: Colors.primary },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 14, height: 52, justifyContent: 'center', alignItems: 'center', marginTop: 18 },
  saveBtnTxt: { fontSize: 16, fontWeight: '800', color: Colors.white },
});
