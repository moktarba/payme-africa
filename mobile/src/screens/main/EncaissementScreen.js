import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, Alert
} from 'react-native';
import { vibrate } from '../../utils/haptics';
import uuid from 'react-native-uuid';
import { Button } from '../../components/ui';
import {
  Colors, Typography, Spacing, BorderRadius, Shadows,
  formatAmount, PROVIDER_LABELS,
} from '../../utils/theme';
import { transactionApi, merchantApi } from '../../services/api';

const QUICK_AMOUNTS = [500, 1000, 1500, 2000, 3000, 5000];

/**
 * Étend la liste des providers retournée par l'API :
 * - L'entrée "paydunya" est remplacée par "Wave (PayDunya)" et "Orange Money (PayDunya)"
 * - Les autres providers (cash, wave natif, etc.) sont conservés tels quels
 */
function expandProviders(apiProviders) {
  const result = [];
  for (const pm of apiProviders) {
    if (pm.provider === 'paydunya') {
      result.push({
        id: 'paydunya_wave',
        provider: 'paydunya',
        softpayProvider: 'wave',
        display_name: 'Wave',
        icon: '🌊',
        sub: 'Paiement Wave via PayDunya',
        needsPhone: true,
      });
      result.push({
        id: 'paydunya_om',
        provider: 'paydunya',
        softpayProvider: 'orange_money',
        display_name: 'Orange Money',
        icon: '🟠',
        sub: 'Paiement Orange Money via PayDunya',
        needsPhone: true,
      });
    } else {
      result.push({
        id: pm.provider,
        provider: pm.provider,
        softpayProvider: null,
        display_name: pm.display_name || PROVIDER_LABELS[pm.provider] || pm.provider,
        icon: pm.provider === 'wave' ? '🌊'
            : pm.provider === 'orange_money' ? '🟠'
            : pm.provider === 'cash' ? '💵'
            : pm.provider === 'free_money' ? '🔴'
            : '💳',
        sub: pm.provider === 'cash' ? 'Paiement en espèces'
           : pm.provider === 'wave' ? 'Paiement Wave (confirmation manuelle)'
           : pm.provider === 'orange_money' ? 'Orange Money (confirmation manuelle)'
           : 'Mobile Money',
        needsPhone: false,
      });
    }
  }
  return result;
}

export default function EncaissementScreen({ navigation }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [providers, setProviders] = useState([]);       // liste étendue
  const [selected, setSelected] = useState(null);       // {id, provider, softpayProvider, ...}
  const [customerPhone, setCustomerPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('amount');           // amount | provider | phone | confirm

  useEffect(() => {
    merchantApi.getPaymentMethods()
      .then((res) => {
        const enabled = res.data.paymentMethods.filter((p) => p.is_enabled);
        setProviders(expandProviders(enabled));
      })
      .catch(() => {});
  }, []);

  const amountNumber = parseInt(amount.replace(/\D/g, '') || '0');

  // Après sélection du montant → choisir le provider
  const handleNext = () => {
    if (amountNumber < 1) { Alert.alert('Montant invalide', 'Entrez un montant supérieur à 0'); return; }
    if (providers.length === 1) {
      setSelected(providers[0]);
      setStep(providers[0].needsPhone ? 'phone' : 'confirm');
    } else {
      setStep('provider');
    }
  };

  // Après sélection du provider
  const handleSelectProvider = (pm) => {
    setSelected(pm);
    setCustomerPhone('');
    vibrate(50);
    setStep(pm.needsPhone ? 'phone' : 'confirm');
  };

  // Lancer la transaction
  const handleInitiate = async () => {
    if (!selected) return;
    if (selected.needsPhone && !customerPhone.trim()) {
      Alert.alert('Numéro requis', 'Entrez le numéro de téléphone du client.');
      return;
    }
    setLoading(true);
    try {
      const body = {
        amount: amountNumber,
        paymentProvider: selected.provider,
        note: note.trim() || undefined,
        clientReference: uuid.v4(),
      };
      if (selected.softpayProvider) {
        body.softpayProvider = selected.softpayProvider;
        if (customerPhone.trim()) body.customerPhone = customerPhone.trim();
      }
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
      });
    } catch (err) {
      Alert.alert('Erreur', err.userMessage || 'Impossible de créer la transaction.');
    } finally {
      setLoading(false);
    }
  };

  // ── Étape 1 — Montant ───────────────────────────────────────────────────────

  if (step === 'amount') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.closeText}>✕ Fermer</Text>
          </TouchableOpacity>
          <Text style={styles.stepTitle}>Montant à encaisser</Text>

          <View style={styles.amountDisplay}>
            <Text style={styles.amountValue}>
              {amountNumber > 0 ? formatAmount(amountNumber) : '0 FCFA'}
            </Text>
          </View>

          <View style={styles.quickGrid}>
            {QUICK_AMOUNTS.map((val) => (
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
      </SafeAreaView>
    );
  }

  // ── Étape 2 — Choix du mode de paiement ────────────────────────────────────

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
            {providers.map((pm) => (
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

  // ── Étape 3 — Numéro du client (SoftPay seulement) ─────────────────────────

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
            <Text style={styles.phoneLabel}>📱 Numéro de téléphone du client</Text>
            <Text style={styles.phoneSub}>
              Le client recevra une demande de paiement {selected?.display_name} sur ce numéro.
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

  // ── Étape 4 — Confirmation ──────────────────────────────────────────────────

  const prevStep = selected?.needsPhone ? 'phone' : providers.length > 1 ? 'provider' : 'amount';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => setStep(prevStep)}>
          <Text style={styles.closeText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.stepTitle}>Confirmer l'encaissement</Text>

        <View style={styles.confirmCard}>
          <Text style={styles.confirmAmount}>{formatAmount(amountNumber)}</Text>
          <View style={styles.confirmDivider} />
          <View style={styles.confirmRow}>
            <Text style={styles.confirmLabel}>Mode de paiement</Text>
            <Text style={styles.confirmValue}>
              {selected?.icon} {selected?.display_name}
            </Text>
          </View>
          {customerPhone ? (
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Numéro client</Text>
              <Text style={styles.confirmValue}>{customerPhone}</Text>
            </View>
          ) : null}
          {note ? (
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Note</Text>
              <Text style={styles.confirmValue}>{note}</Text>
            </View>
          ) : null}
        </View>

        <Button title="Lancer l'encaissement" onPress={handleInitiate} loading={loading} size="xl" style={styles.nextBtn} />
      </View>
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
      {keys.map((key) => (
        <TouchableOpacity key={key} style={kp.key} onPress={() => handleKey(key)} activeOpacity={0.7}>
          <Text style={kp.keyText}>{key}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const kp = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: Spacing.md },
  key: { width: '33.33%', height: 56, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 1, borderRightWidth: 1, borderColor: Colors.border },
  keyText: { fontSize: Typography.fontSizeXL, fontWeight: Typography.fontWeightMedium, color: Colors.gray900 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  container: { flex: 1, padding: Spacing.lg },
  closeBtn: { paddingVertical: Spacing.sm, marginBottom: Spacing.md },
  closeText: { fontSize: Typography.fontSizeMD, color: Colors.primary, fontWeight: Typography.fontWeightMedium },
  stepTitle: { fontSize: Typography.fontSizeXL, fontWeight: Typography.fontWeightBold, color: Colors.gray900, marginBottom: Spacing.md },
  amountDisplay: { alignItems: 'center', paddingVertical: Spacing.xl, borderBottomWidth: 2, borderBottomColor: Colors.primary, marginBottom: Spacing.lg },
  amountValue: { fontSize: 44, fontWeight: Typography.fontWeightExtrabold, color: Colors.primary },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  quickBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white },
  quickBtnActive: { backgroundColor: Colors.primaryBg, borderColor: Colors.primary },
  quickBtnText: { fontSize: Typography.fontSizeMD, color: Colors.gray700 },
  quickBtnTextActive: { color: Colors.primary, fontWeight: Typography.fontWeightSemibold },
  noteInput: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: Typography.fontSizeMD, color: Colors.gray900, marginBottom: Spacing.md, backgroundColor: Colors.gray50 },
  nextBtn: { marginTop: 'auto' },
  amountSummary: { fontSize: Typography.fontSize2XL, fontWeight: Typography.fontWeightExtrabold, color: Colors.primary, marginBottom: Spacing.xl },
  providerList: { gap: Spacing.md },
  providerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, borderWidth: 2, borderColor: Colors.border, ...Shadows.sm },
  providerCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  providerIcon: { fontSize: 36, marginRight: Spacing.md },
  providerInfo: { flex: 1 },
  providerName: { fontSize: Typography.fontSizeLG, fontWeight: Typography.fontWeightBold, color: Colors.gray900 },
  providerSub: { fontSize: Typography.fontSizeSM, color: Colors.gray500, marginTop: 2 },
  providerCheck: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  providerCheckActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  phoneCard: { backgroundColor: Colors.gray50, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  phoneLabel: { fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightBold, color: Colors.gray900, marginBottom: Spacing.sm },
  phoneSub: { fontSize: Typography.fontSizeSM, color: Colors.gray500, marginBottom: Spacing.md, lineHeight: 20 },
  phoneInput: { borderWidth: 1.5, borderColor: Colors.primary, borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: Typography.fontSizeLG, color: Colors.gray900, backgroundColor: Colors.white, fontWeight: Typography.fontWeightSemibold },
  confirmCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.xl, marginBottom: Spacing.xl, ...Shadows.md },
  confirmAmount: { fontSize: 48, fontWeight: Typography.fontWeightExtrabold, color: Colors.primary, textAlign: 'center', marginBottom: Spacing.lg },
  confirmDivider: { height: 1, backgroundColor: Colors.border, marginBottom: Spacing.md },
  confirmRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  confirmLabel: { fontSize: Typography.fontSizeMD, color: Colors.gray600 },
  confirmValue: { fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightSemibold, color: Colors.gray900 },
});
