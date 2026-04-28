import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
  TextInput, Alert, FlatList, Platform, Vibration,
} from 'react-native';
import { Colors, Spacing, BorderRadius, formatAmount, PROVIDER_LABELS } from '../../utils/theme';
import { transactionApi, merchantApi, catalogApi } from '../../services/api';
import uuid from 'react-native-uuid';

const vibe = (p = 40) => { if (Platform.OS !== 'web') Vibration.vibrate(p); };
const QUICK  = [500, 1000, 1500, 2000, 3000, 5000, 10000];
const P_ICON = { wave: '🌊', orange_money: '🟠', free_money: '🔴', cash: '💵' };

export default function EncaissementScreen({ navigation }) {
  const [step, setStep]       = useState('amount');  // amount | provider | confirm
  const [amount, setAmount]   = useState('');
  const [note, setNote]       = useState('');
  const [provider, setProvider] = useState(null);
  const [providers, setProviders] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [cart, setCart]       = useState([]);    // { id, name, price, qty }
  const [loading, setLoading] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);

  useEffect(() => {
    Promise.all([
      merchantApi.getPaymentMethods().catch(() => ({ data: { paymentMethods: [] } })),
      catalogApi.getItems().catch(() => ({ data: { items: [] } })),
    ]).then(([pmRes, catRes]) => {
      const enabled = pmRes.data.paymentMethods?.filter((p) => p.is_enabled) || [];
      setProviders(enabled);
      if (enabled.length === 1) setProvider(enabled[0].provider);
      setCatalog(catRes.data.items || []);
    });
  }, []);

  // Calcul du montant total (direct + panier)
  const directAmount = parseInt(amount.replace(/\D/g, '') || '0');
  const cartTotal    = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const totalAmount  = directAmount + cartTotal;

  // Panier
  const addToCart = (item) => {
    vibe(30);
    setCart((prev) => {
      const ex = prev.find((i) => i.id === item.id);
      if (ex) return prev.map((i) => i.id === item.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...item, qty: 1 }];
    });
  };
  const removeFromCart = (id) => {
    setCart((prev) => {
      const ex = prev.find((i) => i.id === id);
      if (!ex || ex.qty <= 1) return prev.filter((i) => i.id !== id);
      return prev.map((i) => i.id === id ? { ...i, qty: i.qty - 1 } : i);
    });
  };

  const handleNext = () => {
    if (totalAmount < 1) { Alert.alert('Montant invalide', 'Entrez un montant ou sélectionnez des articles.'); return; }
    if (providers.length === 1) { setProvider(providers[0].provider); setStep('confirm'); }
    else setStep('provider');
  };

  const handleInitiate = async () => {
    setLoading(true);
    try {
      const items = cart.map((i) => ({ id: i.id, name: i.name, price: i.price, qty: i.qty }));
      const res = await transactionApi.initiate({
        amount: totalAmount,
        paymentProvider: provider,
        note: note.trim() || undefined,
        clientReference: uuid.v4(),
        itemsSnapshot: items,
      });
      const { transaction, instructions, requiresManualConfirmation } = res.data;
      navigation.navigate('confirmation', {
        transactionId: transaction.id,
        amount: totalAmount,
        provider,
        instructions: instructions || '',
        requiresManualConfirmation: !!requiresManualConfirmation,
      });
    } catch (err) {
      Alert.alert('Erreur', err.userMessage || 'Impossible de créer la transaction.');
    } finally {
      setLoading(false);
    }
  };

  // ── STEP : MONTANT ──────────────────────────────────────────────
  if (step === 'amount') {
    return (
      <SafeAreaView style={s.safe}>
        {/* Header */}
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={s.cancel}>✕ Annuler</Text>
          </TouchableOpacity>
          <Text style={s.topTitle}>Nouvel encaissement</Text>
          <View style={{ width: 80 }} />
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Affichage montant */}
          <View style={s.amountBox}>
            <Text style={[s.amountTxt, totalAmount === 0 && { color: Colors.gray300 }]}>
              {totalAmount > 0 ? formatAmount(totalAmount) : '0 FCFA'}
            </Text>
            {cartTotal > 0 && directAmount > 0 && (
              <Text style={s.amountBreak}>
                Panier {formatAmount(cartTotal)} + Divers {formatAmount(directAmount)}
              </Text>
            )}
          </View>

          {/* Montants rapides */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.quickRow}>
            {QUICK.map((v) => (
              <TouchableOpacity
                key={v}
                style={[s.quickBtn, directAmount === v && s.quickBtnOn]}
                onPress={() => { setAmount(String(v)); vibe(); }}
              >
                <Text style={[s.quickTxt, directAmount === v && s.quickTxtOn]}>
                  {formatAmount(v)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Clavier numérique */}
          <Keypad value={amount} onChange={setAmount} onVibe={vibe} />

          {/* Note */}
          <TextInput
            style={s.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="Note (facultatif)"
            placeholderTextColor={Colors.gray300}
            maxLength={100}
          />

          {/* Panier catalogue */}
          {cart.length > 0 && (
            <View style={s.cartBox}>
              <Text style={s.cartTitle}>🛒 Panier ({cart.length} article{cart.length > 1 ? 's' : ''})</Text>
              {cart.map((item) => (
                <View key={item.id} style={s.cartRow}>
                  <Text style={s.cartName} numberOfLines={1}>{item.name}</Text>
                  <Text style={s.cartPrice}>{formatAmount(item.price)}</Text>
                  <View style={s.qtyRow}>
                    <TouchableOpacity style={s.qtyBtn} onPress={() => removeFromCart(item.id)}>
                      <Text style={s.qtyBtnTxt}>−</Text>
                    </TouchableOpacity>
                    <Text style={s.qty}>{item.qty}</Text>
                    <TouchableOpacity style={s.qtyBtn} onPress={() => addToCart(item)}>
                      <Text style={s.qtyBtnTxt}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Catalogue */}
          <TouchableOpacity
            style={s.catalogToggle}
            onPress={() => setShowCatalog((v) => !v)}
          >
            <Text style={s.catalogToggleTxt}>
              {showCatalog ? '▲ Masquer le catalogue' : '▼ Ajouter depuis le catalogue'}
            </Text>
          </TouchableOpacity>

          {showCatalog && catalog.length > 0 && (
            <View style={s.catalogGrid}>
              {catalog.map((item) => {
                const inCart = cart.find((c) => c.id === item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[s.catItem, inCart && s.catItemOn]}
                    onPress={() => addToCart(item)}
                    activeOpacity={0.75}
                  >
                    <Text style={s.catName} numberOfLines={2}>{item.name}</Text>
                    <Text style={s.catPrice}>{formatAmount(item.price)}</Text>
                    {inCart && <View style={s.catBadge}><Text style={s.catBadgeTxt}>×{inCart.qty}</Text></View>}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {showCatalog && catalog.length === 0 && (
            <View style={s.catalogEmpty}>
              <Text style={s.catalogEmptyTxt}>Aucun article dans le catalogue.{'\n'}Ajoutez-en depuis l'onglet Catalogue.</Text>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Bouton continuer */}
        <View style={s.footer}>
          <TouchableOpacity
            style={[s.nextBtn, totalAmount < 1 && s.nextBtnOff]}
            onPress={handleNext}
            disabled={totalAmount < 1}
          >
            <Text style={s.nextTxt}>
              {totalAmount > 0 ? `Continuer · ${formatAmount(totalAmount)}` : 'Entrez un montant'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── STEP : PROVIDER ─────────────────────────────────────────────
  if (step === 'provider') {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.topBar}>
          <TouchableOpacity onPress={() => setStep('amount')}>
            <Text style={s.cancel}>← Retour</Text>
          </TouchableOpacity>
          <Text style={s.topTitle}>Mode de paiement</Text>
          <View style={{ width: 80 }} />
        </View>

        <Text style={s.providerAmount}>{formatAmount(totalAmount)}</Text>

        <ScrollView style={{ flex: 1, padding: 16 }}>
          {providers.map((pm) => (
            <TouchableOpacity
              key={pm.provider}
              style={[s.pmCard, provider === pm.provider && s.pmCardOn]}
              onPress={() => { setProvider(pm.provider); vibe(); setStep('confirm'); }}
              activeOpacity={0.82}
            >
              <Text style={s.pmIcon}>{P_ICON[pm.provider] || '💳'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.pmName}>{pm.display_name || PROVIDER_LABELS[pm.provider]}</Text>
                <Text style={s.pmSub}>
                  {pm.provider === 'cash' ? 'Espèces · confirmation manuelle'
                   : pm.provider === 'wave' ? 'Wave · confirmation manuelle'
                   : 'Mobile Money'}
                </Text>
              </View>
              <View style={[s.check, provider === pm.provider && s.checkOn]}>
                {provider === pm.provider && <Text style={{ color: Colors.white, fontSize: 14 }}>✓</Text>}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── STEP : CONFIRM ──────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => setStep(providers.length > 1 ? 'provider' : 'amount')}>
          <Text style={s.cancel}>← Retour</Text>
        </TouchableOpacity>
        <Text style={s.topTitle}>Confirmation</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView style={{ flex: 1, padding: 16 }}>
        <View style={s.confirmCard}>
          <Text style={s.confirmAmt}>{formatAmount(totalAmount)}</Text>
          <Divider />
          <Row label="Mode" value={`${P_ICON[provider] || '💳'} ${PROVIDER_LABELS[provider]}`} />
          {note ? <Row label="Note" value={note} /> : null}
          {cart.length > 0 && (
            <>
              <Divider />
              {cart.map((i) => (
                <Row key={i.id} label={`${i.name} ×${i.qty}`} value={formatAmount(i.price * i.qty)} />
              ))}
            </>
          )}
        </View>
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity
          style={[s.nextBtn, loading && s.nextBtnOff]}
          onPress={handleInitiate}
          disabled={loading}
        >
          <Text style={s.nextTxt}>
            {loading ? 'Traitement...' : `🚀 Lancer · ${formatAmount(totalAmount)}`}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// Composants utilitaires
function Keypad({ value, onChange, onVibe }) {
  const keys = ['1','2','3','4','5','6','7','8','9','000','0','⌫'];
  const press = (k) => {
    onVibe(25);
    if (k === '⌫') return onChange(value.slice(0,-1));
    if (k === '000' && !value) return;
    const next = value + k;
    if (parseInt(next) > 9_999_999) return;
    onChange(next);
  };
  return (
    <View style={kp.grid}>
      {keys.map((k) => (
        <TouchableOpacity key={k} style={kp.key} onPress={() => press(k)} activeOpacity={0.6}>
          <Text style={kp.txt}>{k}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const Divider = () => <View style={{ height: 1, backgroundColor: Colors.border, marginVertical: 8 }} />;
const Row = ({ label, value }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
    <Text style={{ fontSize: 15, color: Colors.gray600 }}>{label}</Text>
    <Text style={{ fontSize: 15, fontWeight: '600', color: Colors.gray900 }}>{value}</Text>
  </View>
);

const kp = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, borderTopColor: Colors.border },
  key: { width: '33.33%', height: 58, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: Colors.border },
  txt: { fontSize: 22, fontWeight: '500', color: Colors.gray900 },
});

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.white },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  cancel: { fontSize: 15, color: Colors.primary, fontWeight: '600', width: 80 },
  topTitle: { fontSize: 17, fontWeight: '700', color: Colors.gray900 },

  amountBox: { alignItems: 'center', paddingVertical: 28, borderBottomWidth: 2, borderBottomColor: Colors.primary },
  amountTxt: { fontSize: 44, fontWeight: '800', color: Colors.primary },
  amountBreak: { fontSize: 13, color: Colors.gray400, marginTop: 4 },

  quickRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  quickBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white },
  quickBtnOn: { backgroundColor: Colors.primaryBg, borderColor: Colors.primary },
  quickTxt: { fontSize: 14, color: Colors.gray700 },
  quickTxtOn: { color: Colors.primary, fontWeight: '700' },

  noteInput: { marginHorizontal: 16, marginBottom: 8, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 12, fontSize: 15, color: Colors.gray900, backgroundColor: Colors.gray50 },

  cartBox: { marginHorizontal: 16, marginBottom: 8, backgroundColor: Colors.primaryBg, borderRadius: 12, padding: 12 },
  cartTitle: { fontSize: 14, fontWeight: '700', color: Colors.primary, marginBottom: 8 },
  cartRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  cartName: { flex: 1, fontSize: 14, color: Colors.gray800 },
  cartPrice: { fontSize: 14, fontWeight: '600', color: Colors.gray800, marginRight: 8 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.white, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  qtyBtnTxt: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  qty: { fontSize: 16, fontWeight: '700', color: Colors.gray900, minWidth: 20, textAlign: 'center' },

  catalogToggle: { marginHorizontal: 16, marginVertical: 8, padding: 12, backgroundColor: Colors.gray50, borderRadius: 10, alignItems: 'center' },
  catalogToggleTxt: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  catalogGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  catItem: { width: '47%', backgroundColor: Colors.white, borderRadius: 12, padding: 12, borderWidth: 1.5, borderColor: Colors.border },
  catItemOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  catName: { fontSize: 14, fontWeight: '600', color: Colors.gray900, marginBottom: 4 },
  catPrice: { fontSize: 15, fontWeight: '800', color: Colors.primary },
  catBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: Colors.primary, borderRadius: 99, paddingHorizontal: 7, paddingVertical: 2 },
  catBadgeTxt: { fontSize: 11, fontWeight: '800', color: Colors.white },
  catalogEmpty: { marginHorizontal: 16, padding: 20, backgroundColor: Colors.gray50, borderRadius: 12, alignItems: 'center' },
  catalogEmptyTxt: { fontSize: 14, color: Colors.gray400, textAlign: 'center', lineHeight: 20 },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 28, backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border },
  nextBtn: { backgroundColor: Colors.primary, borderRadius: 16, height: 58, justifyContent: 'center', alignItems: 'center' },
  nextBtnOff: { opacity: 0.4 },
  nextTxt: { fontSize: 18, fontWeight: '800', color: Colors.white },

  providerAmount: { fontSize: 36, fontWeight: '800', color: Colors.primary, textAlign: 'center', padding: 24 },
  pmCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 16, padding: 18, marginBottom: 10, borderWidth: 2, borderColor: Colors.border, gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  pmCardOn: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  pmIcon: { fontSize: 32 },
  pmName: { fontSize: 17, fontWeight: '700', color: Colors.gray900 },
  pmSub: { fontSize: 13, color: Colors.gray400, marginTop: 2 },
  check: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  checkOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },

  confirmCard: { backgroundColor: Colors.white, borderRadius: 18, padding: 22, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 },
  confirmAmt: { fontSize: 48, fontWeight: '800', color: Colors.primary, textAlign: 'center', marginBottom: 12 },
});
