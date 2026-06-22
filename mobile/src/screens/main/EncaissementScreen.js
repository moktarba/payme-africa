import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, Alert, FlatList,
} from 'react-native';
import { vibrate } from '../../utils/haptics';
import uuid from 'react-native-uuid';
import { Button } from '../../components/ui';
import {
  Colors, Typography, Spacing, BorderRadius, Shadows,
  formatAmount, PROVIDER_LABELS,
} from '../../utils/theme';
import { transactionApi, merchantApi, catalogApi } from '../../services/api';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { enqueue, getQueue, syncAll } from '../../services/offlineQueue';

const QUICK_AMOUNTS = [500, 1000, 1500, 2000, 3000, 5000];

// ── Helpers providers ────────────────────────────────────────────────────────
function expandProviders(apiProviders) {
  const result = [];
  for (const pm of apiProviders) {
    if (pm.provider === 'paydunya') {
      result.push({
        id: 'paydunya_wave', provider: 'paydunya', softpayProvider: 'wave',
        display_name: 'Wave', icon: '🌊', sub: 'Paiement Wave via PayDunya', needsPhone: true,
      });
      result.push({
        id: 'paydunya_om', provider: 'paydunya', softpayProvider: 'orange_money',
        display_name: 'Orange Money', icon: '🟠', sub: 'Paiement Orange Money via PayDunya', needsPhone: true,
      });
    } else {
      result.push({
        id: pm.provider, provider: pm.provider, softpayProvider: null,
        display_name: pm.display_name || PROVIDER_LABELS[pm.provider] || pm.provider,
        icon: pm.provider === 'wave' ? '🌊' : pm.provider === 'orange_money' ? '🟠'
            : pm.provider === 'cash' ? '💵' : pm.provider === 'free_money' ? '🔴' : '💳',
        sub: pm.provider === 'cash' ? 'Paiement en espèces'
           : pm.provider === 'wave' ? 'Wave (confirmation manuelle)'
           : pm.provider === 'orange_money' ? 'Orange Money (confirmation manuelle)'
           : 'Mobile Money',
        needsPhone: false,
      });
    }
  }
  return result;
}

// ── Calcul panier ────────────────────────────────────────────────────────────
function cartTotal(cart) {
  return Object.values(cart).reduce((sum, { price, qty }) => sum + price * qty, 0);
}
function cartCount(cart) {
  return Object.values(cart).reduce((sum, { qty }) => sum + qty, 0);
}
function cartToSnapshot(cart, catalogItems) {
  return Object.entries(cart)
    .filter(([, v]) => v.qty > 0)
    .map(([id, { qty }]) => {
      const item = catalogItems.find(i => i.id === id);
      return { id, name: item?.name || '', price: item?.price || 0, qty, subtotal: (item?.price || 0) * qty };
    });
}

// ── Composant item catalogue ─────────────────────────────────────────────────
function CatalogItemRow({ item, qty, onAdd, onRemove }) {
  return (
    <View style={cat.row}>
      <View style={cat.info}>
        <Text style={cat.name} numberOfLines={1}>{item.name}</Text>
        {item.category ? <Text style={cat.category}>{item.category}</Text> : null}
        <Text style={cat.price}>{formatAmount(item.price)}</Text>
      </View>
      <View style={cat.controls}>
        {qty > 0 && (
          <TouchableOpacity style={cat.btn} onPress={() => { onRemove(item.id); vibrate(30); }}>
            <Text style={cat.btnText}>−</Text>
          </TouchableOpacity>
        )}
        {qty > 0 && <Text style={cat.qty}>{qty}</Text>}
        <TouchableOpacity style={[cat.btn, cat.btnAdd]} onPress={() => { onAdd(item.id, item.price); vibrate(30); }}>
          <Text style={[cat.btnText, { color: Colors.white }]}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────────────
export default function EncaissementScreen({ navigation }) {
  const { isOnline }              = useNetworkStatus();
  const [inputMode, setInputMode] = useState('keypad'); // 'keypad' | 'catalog'
  const [amount, setAmount]       = useState('');
  const [note, setNote]           = useState('');
  const [providers, setProviders] = useState([]);
  const [selected, setSelected]   = useState(null);
  const [customerPhone, setCustomerPhone] = useState('');
  const [loading, setLoading]     = useState(false);
  const [step, setStep]           = useState('amount'); // amount | provider | phone | confirm
  const [pendingCount, setPendingCount] = useState(0);

  // Catalogue
  const [catalogItems, setCatalogItems] = useState([]);
  const [cart, setCart]                 = useState({}); // { [itemId]: { price, qty } }
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [search, setSearch]             = useState('');

  useEffect(() => {
    merchantApi.getPaymentMethods()
      .then(res => setProviders(expandProviders(res.data.paymentMethods.filter(p => p.is_enabled))))
      .catch(() => {});
    setPendingCount(getQueue().length);
  }, []);

  // Sync automatique au retour du réseau
  useEffect(() => {
    if (isOnline && getQueue().length > 0) {
      syncAll((payload) => transactionApi.initiate(payload))
        .then(({ synced, failed }) => {
          setPendingCount(getQueue().length);
          if (synced > 0) Alert.alert('Synchronisation', `${synced} transaction(s) envoyée(s) au serveur.${failed > 0 ? `\n${failed} en erreur.` : ''}`);
        })
        .catch(() => {});
    }
  }, [isOnline]);

  const loadCatalog = useCallback(() => {
    if (catalogLoaded) return;
    catalogApi.getItems()
      .then(res => { setCatalogItems(res.data.items || []); setCatalogLoaded(true); })
      .catch(() => setCatalogLoaded(true));
  }, [catalogLoaded]);

  // Montant effectif : clavier ou panier
  const amountNumber = inputMode === 'catalog'
    ? cartTotal(cart)
    : parseInt(amount.replace(/\D/g, '') || '0');

  const snapshot = inputMode === 'catalog' ? cartToSnapshot(cart, catalogItems) : [];

  // ── Panier ─────────────────────────────────────────────────────────────────
  const addToCart = (id, price) => {
    setCart(prev => ({
      ...prev,
      [id]: { price, qty: (prev[id]?.qty || 0) + 1 },
    }));
  };
  const removeFromCart = (id) => {
    setCart(prev => {
      const qty = (prev[id]?.qty || 0) - 1;
      if (qty <= 0) { const { [id]: _, ...rest } = prev; return rest; }
      return { ...prev, [id]: { ...prev[id], qty } };
    });
  };

  // ── Navigation ──────────────────────────────────────────────────────────────
  const handleNext = () => {
    if (amountNumber < 1) { Alert.alert('Montant invalide', 'Ajoutez au moins un article ou saisissez un montant.'); return; }
    if (providers.length === 1) {
      setSelected(providers[0]);
      setStep(providers[0].needsPhone ? 'phone' : 'confirm');
    } else {
      setStep('provider');
    }
  };

  const handleSelectProvider = (pm) => {
    setSelected(pm); setCustomerPhone(''); vibrate(50);
    setStep(pm.needsPhone ? 'phone' : 'confirm');
  };

  // ── Initier la transaction ──────────────────────────────────────────────────
  const handleInitiate = async () => {
    if (!selected) return;
    if (selected.needsPhone && !customerPhone.trim()) {
      Alert.alert('Numéro requis', 'Entrez le numéro de téléphone du client.'); return;
    }

    const body = {
      amount: amountNumber,
      paymentProvider: selected.provider,
      note: note.trim() || undefined,
      clientReference: uuid.v4(),
      itemsSnapshot: snapshot.length > 0 ? snapshot : undefined,
    };
    if (selected.softpayProvider) {
      body.softpayProvider = selected.softpayProvider;
      if (customerPhone.trim()) body.customerPhone = customerPhone.trim();
    }

    // ── Mode OFFLINE : cash uniquement ──────────────────────────────────────
    if (!isOnline) {
      if (selected.provider !== 'cash') {
        Alert.alert('Hors connexion', 'Seul le paiement en espèces est possible sans réseau.\nConnectez-vous pour utiliser Wave ou Orange Money.');
        return;
      }
      const localId = enqueue(body);
      setPendingCount(getQueue().length);
      Alert.alert(
        '✅ Transaction en attente',
        `Montant : ${formatAmount(amountNumber)}\nMode : Espèces\nElle sera envoyée automatiquement quand votre réseau reviendra.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      return;
    }

    // ── Mode ONLINE ─────────────────────────────────────────────────────────
    setLoading(true);
    try {
      const res = await transactionApi.initiate(body);
      const { transaction, instructions, requiresManualConfirmation } = res.data;
      navigation.navigate('confirmation', {
        transactionId: transaction.id,
        amount: amountNumber,
        provider: selected.provider,
        providerLabel: selected.display_name,
        providerIcon: selected.icon,
        instructions: instructions || '',
        requiresManualConfirmation: !!requiresManualConfirmation,
        note: note.trim() || undefined,
        itemCount: snapshot.length,
      });
    } catch (err) {
      Alert.alert('Erreur', err.userMessage || 'Impossible de créer la transaction.');
    } finally {
      setLoading(false);
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // ÉTAPE 1 — Montant (Saisie libre ou Catalogue)
  // ════════════════════════════════════════════════════════════════════════════
  if (step === 'amount') {
    const filteredItems = search.trim()
      ? catalogItems.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || (i.category || '').toLowerCase().includes(search.toLowerCase()))
      : catalogItems;

    return (
      <SafeAreaView style={styles.safe}>
        <View style={{ flex: 1 }}>
          {/* Bannière offline */}
          {!isOnline && (
            <View style={styles.offlineBanner}>
              <Text style={styles.offlineBannerText}>
                📵 Hors connexion — seul le paiement en espèces est disponible
                {pendingCount > 0 ? ` · ${pendingCount} en attente` : ''}
              </Text>
            </View>
          )}
          {isOnline && pendingCount > 0 && (
            <View style={styles.syncBanner}>
              <Text style={styles.syncBannerText}>🔄 Synchronisation de {pendingCount} transaction(s)...</Text>
            </View>
          )}

          {/* Header */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.closeText}>✕ Fermer</Text>
            </TouchableOpacity>
            <Text style={styles.topTitle}>Encaisser</Text>
            {/* Panier badge */}
            {cartCount(cart) > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount(cart)}</Text>
              </View>
            )}
          </View>

          {/* Onglets */}
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, inputMode === 'keypad' && styles.tabActive]}
              onPress={() => setInputMode('keypad')}
            >
              <Text style={[styles.tabText, inputMode === 'keypad' && styles.tabTextActive]}>⌨️ Saisie libre</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, inputMode === 'catalog' && styles.tabActive]}
              onPress={() => { setInputMode('catalog'); loadCatalog(); }}
            >
              <Text style={[styles.tabText, inputMode === 'catalog' && styles.tabTextActive]}>
                📋 Catalogue{cartCount(cart) > 0 ? ` (${cartCount(cart)})` : ''}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Mode Saisie libre ── */}
          {inputMode === 'keypad' && (
            <View style={styles.container}>
              <View style={styles.amountDisplay}>
                <Text style={styles.amountValue}>
                  {amountNumber > 0 ? formatAmount(amountNumber) : '0 FCFA'}
                </Text>
              </View>
              <View style={styles.quickGrid}>
                {QUICK_AMOUNTS.map(val => (
                  <TouchableOpacity
                    key={val}
                    style={[styles.quickBtn, amountNumber === val && styles.quickBtnActive]}
                    onPress={() => { setAmount(String(val)); vibrate(50); }}
                  >
                    <Text style={[styles.quickBtnText, amountNumber === val && styles.quickBtnTextActive]}>
                      {formatAmount(val)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Keypad value={amount} onChange={setAmount} />
              <TextInput
                style={styles.noteInput}
                value={note}
                onChangeText={setNote}
                placeholder="Note (facultatif)"
                placeholderTextColor={Colors.gray400}
                maxLength={100}
              />
              <Button
                title={amountNumber > 0 ? `Continuer → ${formatAmount(amountNumber)}` : 'Continuer'}
                onPress={handleNext}
                disabled={amountNumber < 1}
                size="xl"
                style={styles.nextBtn}
              />
            </View>
          )}

          {/* ── Mode Catalogue ── */}
          {inputMode === 'catalog' && (
            <View style={{ flex: 1 }}>
              {/* Montant panier + barre recherche */}
              <View style={styles.catalogHeader}>
                <Text style={styles.cartTotal}>
                  {amountNumber > 0 ? formatAmount(amountNumber) : '0 FCFA'}
                </Text>
                <TextInput
                  style={styles.searchInput}
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Rechercher un article..."
                  placeholderTextColor={Colors.gray400}
                />
              </View>

              {catalogItems.length === 0 && catalogLoaded ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>📦</Text>
                  <Text style={styles.emptyTitle}>Catalogue vide</Text>
                  <Text style={styles.emptySub}>Ajoutez des articles dans l'onglet Catalogue du menu.</Text>
                </View>
              ) : (
                <FlatList
                  data={filteredItems}
                  keyExtractor={i => i.id}
                  renderItem={({ item }) => (
                    <CatalogItemRow
                      item={item}
                      qty={cart[item.id]?.qty || 0}
                      onAdd={addToCart}
                      onRemove={removeFromCart}
                    />
                  )}
                  contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: 120 }}
                  ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: Colors.border }} />}
                />
              )}

              {/* Note + bouton bas */}
              <View style={styles.catalogFooter}>
                <TextInput
                  style={[styles.noteInput, { marginBottom: 0, marginHorizontal: Spacing.lg }]}
                  value={note}
                  onChangeText={setNote}
                  placeholder="Note (facultatif)"
                  placeholderTextColor={Colors.gray400}
                  maxLength={100}
                />
                <View style={{ paddingHorizontal: Spacing.lg, marginTop: Spacing.sm }}>
                  <Button
                    title={amountNumber > 0
                      ? `Continuer → ${formatAmount(amountNumber)} (${cartCount(cart)} art.)`
                      : 'Choisissez des articles'}
                    onPress={handleNext}
                    disabled={amountNumber < 1}
                    size="xl"
                  />
                </View>
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ÉTAPE 2 — Choix du mode de paiement
  // ════════════════════════════════════════════════════════════════════════════
  if (step === 'provider') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => setStep('amount')}>
            <Text style={styles.closeText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.stepTitle}>Mode de paiement</Text>
          <Text style={styles.amountSummary}>{formatAmount(amountNumber)}</Text>
          <View style={styles.providerList}>
            {providers.map(pm => (
              <TouchableOpacity
                key={pm.id}
                style={[styles.providerCard, selected?.id === pm.id && styles.providerCardActive]}
                onPress={() => handleSelectProvider(pm)}
                activeOpacity={0.85}
              >
                <Text style={styles.providerIcon}>{pm.icon}</Text>
                <View style={styles.providerInfo}>
                  <Text style={styles.providerName}>{pm.display_name}</Text>
                  <Text style={styles.providerSub}>{pm.sub}</Text>
                </View>
                <View style={[styles.providerCheck, selected?.id === pm.id && styles.providerCheckActive]}>
                  {selected?.id === pm.id && <Text style={{ color: Colors.white }}>✓</Text>}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ÉTAPE 3 — Numéro client (SoftPay)
  // ════════════════════════════════════════════════════════════════════════════
  if (step === 'phone') {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => setStep(providers.length > 1 ? 'provider' : 'amount')}>
            <Text style={styles.closeText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.stepTitle}>{selected?.icon} {selected?.display_name}</Text>
          <Text style={styles.amountSummary}>{formatAmount(amountNumber)}</Text>
          <View style={styles.phoneCard}>
            <Text style={styles.phoneLabel}>📱 Numéro du client</Text>
            <Text style={styles.phoneSub}>
              Le client recevra une demande {selected?.display_name} sur ce numéro.
            </Text>
            <TextInput
              style={styles.phoneInput}
              value={customerPhone}
              onChangeText={setCustomerPhone}
              placeholder="+221 7X XXX XX XX"
              placeholderTextColor={Colors.gray400}
              keyboardType="phone-pad"
              maxLength={20}
              autoFocus
            />
          </View>
          <Button
            title="Continuer"
            onPress={() => {
              if (!customerPhone.trim()) { Alert.alert('Numéro requis', 'Entrez le numéro du client.'); return; }
              setStep('confirm');
            }}
            size="xl"
            style={{ marginTop: Spacing.md }}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ÉTAPE 4 — Confirmation
  // ════════════════════════════════════════════════════════════════════════════
  const prevStep = selected?.needsPhone ? 'phone' : providers.length > 1 ? 'provider' : 'amount';
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => setStep(prevStep)}>
          <Text style={styles.closeText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.stepTitle}>Confirmer l'encaissement</Text>

        <View style={styles.confirmCard}>
          <Text style={styles.confirmAmount}>{formatAmount(amountNumber)}</Text>
          <View style={styles.confirmDivider} />
          <View style={styles.confirmRow}>
            <Text style={styles.confirmLabel}>Mode</Text>
            <Text style={styles.confirmValue}>{selected?.icon} {selected?.display_name}</Text>
          </View>
          {customerPhone ? (
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Numéro client</Text>
              <Text style={styles.confirmValue}>{customerPhone}</Text>
            </View>
          ) : null}
          {/* Articles du panier */}
          {snapshot.length > 0 && (
            <>
              <View style={styles.confirmDivider} />
              <Text style={[styles.confirmLabel, { marginBottom: 6 }]}>🛒 {snapshot.length} article(s)</Text>
              {snapshot.map(item => (
                <View key={item.id} style={styles.cartRow}>
                  <Text style={styles.cartItemName} numberOfLines={1}>{item.name} ×{item.qty}</Text>
                  <Text style={styles.cartItemPrice}>{formatAmount(item.subtotal)}</Text>
                </View>
              ))}
            </>
          )}
          {note ? (
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Note</Text>
              <Text style={styles.confirmValue}>{note}</Text>
            </View>
          ) : null}
        </View>

        <Button title="Lancer l'encaissement" onPress={handleInitiate} loading={loading} size="xl" />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Clavier numérique ────────────────────────────────────────────────────────
function Keypad({ value, onChange }) {
  const keys = ['1','2','3','4','5','6','7','8','9','000','0','⌫'];
  const handleKey = (key) => {
    if (key === '⌫') { onChange(value.slice(0, -1)); }
    else {
      if (key === '000' && !value) return;
      const newVal = value + key;
      if (parseInt(newVal) > 9999999) return;
      onChange(newVal);
    }
    vibrate(30);
  };
  return (
    <View style={kp.grid}>
      {keys.map(key => (
        <TouchableOpacity key={key} style={kp.key} onPress={() => handleKey(key)} activeOpacity={0.7}>
          <Text style={kp.keyText}>{key}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const kp = StyleSheet.create({
  grid:    { flexDirection: 'row', flexWrap: 'wrap', marginBottom: Spacing.md },
  key:     { width: '33.33%', height: 56, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 1, borderRightWidth: 1, borderColor: Colors.border },
  keyText: { fontSize: Typography.fontSizeXL, fontWeight: Typography.fontWeightMedium, color: Colors.gray900 },
});

const cat = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, backgroundColor: Colors.white },
  info:     { flex: 1, paddingRight: Spacing.sm },
  name:     { fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightSemibold, color: Colors.gray900 },
  category: { fontSize: Typography.fontSizeSM, color: Colors.gray500, marginTop: 2 },
  price:    { fontSize: Typography.fontSizeMD, color: Colors.primary, fontWeight: Typography.fontWeightBold, marginTop: 2 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  btn:      { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  btnAdd:   { backgroundColor: Colors.primary },
  btnText:  { fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold, color: Colors.primary, lineHeight: 22 },
  qty:      { fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold, color: Colors.gray900, minWidth: 20, textAlign: 'center' },
});

const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: Colors.white },
  offlineBanner:  { backgroundColor: '#B91C1C', paddingVertical: 8, paddingHorizontal: Spacing.md },
  offlineBannerText:{ color: '#fff', fontSize: Typography.fontSizeSM, textAlign: 'center', fontWeight: Typography.fontWeightSemibold },
  syncBanner:     { backgroundColor: '#1D4ED8', paddingVertical: 6, paddingHorizontal: Spacing.md },
  syncBannerText: { color: '#fff', fontSize: Typography.fontSizeSM, textAlign: 'center' },
  container:    { flex: 1, padding: Spacing.lg },
  topBar:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  closeText:    { fontSize: Typography.fontSizeMD, color: Colors.primary, fontWeight: Typography.fontWeightMedium },
  topTitle:     { fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold, color: Colors.gray900 },
  cartBadge:    { backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  cartBadgeText:{ color: Colors.white, fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightBold },
  closeBtn:     { paddingVertical: Spacing.sm, marginBottom: Spacing.md },

  // Onglets
  tabs:          { flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: Colors.border },
  tab:           { flex: 1, paddingVertical: Spacing.md, alignItems: 'center' },
  tabActive:     { borderBottomWidth: 2, borderBottomColor: Colors.primary, marginBottom: -2 },
  tabText:       { fontSize: Typography.fontSizeMD, color: Colors.gray500, fontWeight: Typography.fontWeightMedium },
  tabTextActive: { color: Colors.primary, fontWeight: Typography.fontWeightBold },

  // Saisie libre
  amountDisplay:      { alignItems: 'center', paddingVertical: Spacing.xl, borderBottomWidth: 2, borderBottomColor: Colors.primary, marginBottom: Spacing.lg },
  amountValue:        { fontSize: 44, fontWeight: Typography.fontWeightExtrabold, color: Colors.primary },
  quickGrid:          { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  quickBtn:           { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white },
  quickBtnActive:     { backgroundColor: Colors.primaryBg, borderColor: Colors.primary },
  quickBtnText:       { fontSize: Typography.fontSizeMD, color: Colors.gray700 },
  quickBtnTextActive: { color: Colors.primary, fontWeight: Typography.fontWeightSemibold },
  noteInput:          { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: Typography.fontSizeMD, color: Colors.gray900, marginBottom: Spacing.md, backgroundColor: Colors.gray50 },
  nextBtn:            { marginTop: 'auto' },

  // Catalogue
  catalogHeader: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.white },
  cartTotal:     { fontSize: 32, fontWeight: Typography.fontWeightExtrabold, color: Colors.primary, textAlign: 'center', marginBottom: Spacing.sm },
  searchInput:   { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.sm, fontSize: Typography.fontSizeMD, color: Colors.gray900, backgroundColor: Colors.gray50 },
  catalogFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border, paddingVertical: Spacing.md, ...Shadows.md },
  emptyState:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emptyEmoji:    { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle:    { fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold, color: Colors.gray900, marginBottom: Spacing.sm },
  emptySub:      { fontSize: Typography.fontSizeMD, color: Colors.gray500, textAlign: 'center', lineHeight: 22 },

  // Provider
  amountSummary:      { fontSize: Typography.fontSize2XL, fontWeight: Typography.fontWeightExtrabold, color: Colors.primary, marginBottom: Spacing.xl },
  stepTitle:          { fontSize: Typography.fontSizeXL, fontWeight: Typography.fontWeightBold, color: Colors.gray900, marginBottom: Spacing.md },
  providerList:       { gap: Spacing.md },
  providerCard:       { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 2, borderColor: Colors.border, ...Shadows.sm },
  providerCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  providerIcon:       { fontSize: 36, marginRight: Spacing.md },
  providerInfo:       { flex: 1 },
  providerName:       { fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold, color: Colors.gray900 },
  providerSub:        { fontSize: Typography.fontSizeSM, color: Colors.gray500, marginTop: 2 },
  providerCheck:      { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  providerCheckActive:{ backgroundColor: Colors.primary, borderColor: Colors.primary },

  // Phone
  phoneCard:  { backgroundColor: Colors.gray50, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  phoneLabel: { fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightBold, color: Colors.gray900, marginBottom: Spacing.sm },
  phoneSub:   { fontSize: Typography.fontSizeSM, color: Colors.gray500, marginBottom: Spacing.md, lineHeight: 20 },
  phoneInput: { borderWidth: 1.5, borderColor: Colors.primary, borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: Typography.fontSizeLG, color: Colors.gray900, backgroundColor: Colors.white, fontWeight: Typography.fontWeightSemibold },

  // Confirm
  confirmCard:   { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.xl, marginBottom: Spacing.xl, ...Shadows.md },
  confirmAmount: { fontSize: 48, fontWeight: Typography.fontWeightExtrabold, color: Colors.primary, textAlign: 'center', marginBottom: Spacing.lg },
  confirmDivider:{ height: 1, backgroundColor: Colors.border, marginBottom: Spacing.md, marginTop: Spacing.sm },
  confirmRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  confirmLabel:  { fontSize: Typography.fontSizeMD, color: Colors.gray600 },
  confirmValue:  { fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightSemibold, color: Colors.gray900, maxWidth: '60%', textAlign: 'right' },
  cartRow:       { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  cartItemName:  { fontSize: Typography.fontSizeSM, color: Colors.gray700, flex: 1, marginRight: Spacing.sm },
  cartItemPrice: { fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightSemibold, color: Colors.gray900 },
});
