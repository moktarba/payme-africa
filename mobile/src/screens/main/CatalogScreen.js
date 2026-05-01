import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity,
  TextInput, Alert, RefreshControl, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Colors, Spacing, BorderRadius, formatAmount } from '../../utils/theme';
import { catalogApi } from '../../services/api';

export default function CatalogScreen() {
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal]       = useState(false);
  const [editing, setEditing]   = useState(null);  // null = création
  const [form, setForm]         = useState({ name: '', price: '', category: '' });
  const [saving, setSaving]     = useState(false);
  const [search, setSearch]     = useState('');

  const load = useCallback(async (silent = false) => {
    try {
      const res = await catalogApi.getItems();
      setItems(res.data.items || []);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm({ name: '', price: '', category: '' }); setModal(true); };
  const openEdit   = (item) => {
    setEditing(item);
    setForm({ name: item.name, price: String(item.price), category: item.category || '' });
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Erreur', 'Le nom est requis.'); return; }
    const price = parseInt(form.price) || 0;
    setSaving(true);
    try {
      if (editing) {
        await catalogApi.updateItem(editing.id, { name: form.name.trim(), price, category: form.category.trim() || undefined });
      } else {
        await catalogApi.createItem({ name: form.name.trim(), price, category: form.category.trim() || undefined });
      }
      setModal(false);
      load();
    } catch (err) {
      Alert.alert('Erreur', err.userMessage || 'Impossible de sauvegarder.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item) => {
    Alert.alert('Supprimer', `Supprimer "${item.name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => {
          try { await catalogApi.deleteItem(item.id); load(); }
          catch (err) { Alert.alert('Erreur', err.userMessage || 'Impossible de supprimer.'); }
        },
      },
    ]);
  };

  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.category || '').toLowerCase().includes(search.toLowerCase())
  );

  // Grouper par catégorie
  const grouped = filtered.reduce((acc, item) => {
    const cat = item.category || 'Sans catégorie';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Catalogue</Text>
        <TouchableOpacity style={s.addBtn} onPress={openCreate}>
          <Text style={s.addBtnTxt}>+ Ajouter</Text>
        </TouchableOpacity>
      </View>

      {/* Recherche */}
      <View style={s.searchWrap}>
        <TextInput
          style={s.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher un article..."
          placeholderTextColor={Colors.gray300}
        />
      </View>

      {/* Liste */}
      {loading ? (
        <View style={s.empty}><Text style={s.emptyTxt}>Chargement...</Text></View>
      ) : items.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>🗂️</Text>
          <Text style={s.emptyTitle}>Catalogue vide</Text>
          <Text style={s.emptyTxt}>Ajoutez vos articles pour les sélectionner rapidement lors de l'encaissement.</Text>
          <TouchableOpacity style={s.emptyBtn} onPress={openCreate}>
            <Text style={s.emptyBtnTxt}>+ Ajouter mon premier article</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={Object.entries(grouped)}
          keyExtractor={([cat]) => cat}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: [cat, catItems] }) => (
            <View style={s.group}>
              <Text style={s.groupLabel}>{cat}</Text>
              {catItems.map((item) => (
                <View key={item.id} style={s.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.itemName}>{item.name}</Text>
                    <Text style={s.itemPrice}>{formatAmount(item.price)}</Text>
                  </View>
                  <TouchableOpacity style={s.editBtn} onPress={() => openEdit(item)}>
                    <Text style={s.editBtnTxt}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.delBtn} onPress={() => handleDelete(item)}>
                    <Text style={s.delBtnTxt}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        />
      )}

      {/* Modal création/édition */}
      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalBg}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editing ? 'Modifier l\'article' : 'Nouvel article'}</Text>
              <TouchableOpacity onPress={() => setModal(false)}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.fieldLabel}>Nom *</Text>
            <TextInput
              style={s.field}
              value={form.name}
              onChangeText={(v) => setForm({ ...form, name: v })}
              placeholder="Ex: Eau minérale 1,5L"
              placeholderTextColor={Colors.gray300}
              autoFocus
            />

            <Text style={s.fieldLabel}>Prix (FCFA) *</Text>
            <TextInput
              style={s.field}
              value={form.price}
              onChangeText={(v) => setForm({ ...form, price: v.replace(/\D/g, '') })}
              placeholder="Ex: 500"
              placeholderTextColor={Colors.gray300}
              keyboardType="number-pad"
            />

            <Text style={s.fieldLabel}>Catégorie (facultatif)</Text>
            <TextInput
              style={s.field}
              value={form.category}
              onChangeText={(v) => setForm({ ...form, category: v })}
              placeholder="Ex: Boissons, Plats..."
              placeholderTextColor={Colors.gray300}
            />

            <TouchableOpacity
              style={[s.saveBtn, saving && { opacity: 0.5 }]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={s.saveBtnTxt}>{saving ? 'Enregistrement...' : (editing ? 'Modifier' : 'Ajouter')}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 10 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.gray900 },
  addBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnTxt: { fontSize: 15, fontWeight: '700', color: Colors.white },
  searchWrap: { paddingHorizontal: 16, marginBottom: 8 },
  search: { backgroundColor: Colors.white, borderRadius: 12, padding: 12, fontSize: 15, color: Colors.gray900, borderWidth: 1, borderColor: Colors.border },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.gray900, marginBottom: 8 },
  emptyTxt: { fontSize: 15, color: Colors.gray400, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  emptyBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 },
  emptyBtnTxt: { fontSize: 15, fontWeight: '700', color: Colors.white },

  group: { marginBottom: 16 },
  groupLabel: { fontSize: 13, fontWeight: '700', color: Colors.gray400, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 12, padding: 14, marginBottom: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  itemName: { fontSize: 16, fontWeight: '600', color: Colors.gray900 },
  itemPrice: { fontSize: 15, fontWeight: '800', color: Colors.primary, marginTop: 2 },
  editBtn: { padding: 8, marginLeft: 4 },
  editBtnTxt: { fontSize: 18 },
  delBtn: { padding: 8, marginLeft: 2 },
  delBtnTxt: { fontSize: 18 },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.gray900 },
  modalClose: { fontSize: 22, color: Colors.gray400 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: Colors.gray600, marginBottom: 6, marginTop: 12 },
  field: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10, padding: 13, fontSize: 16, color: Colors.gray900, backgroundColor: Colors.gray50 },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 14, height: 54, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  saveBtnTxt: { fontSize: 17, fontWeight: '800', color: Colors.white },
});
