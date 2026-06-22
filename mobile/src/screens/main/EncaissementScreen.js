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
  formatAmount, PROVIDER_LABELS, PROVIDER_COLORS
} from '../../utils/theme';
import { transactionApi, merchantApi } from '../../services/api';

const QUICK_AMOUNTS = [500, 1000, 1500, 2000, 3000, 5000];
const PROVIDER_ICONS = { wave: '🌊', orange_money: '🟠', free_money: '🔴', cash: '💵', paydunya: '💳' };

// Options PayDunya SoftPay
const PAYDUNYA_SOFTPAY_OPTIONS = [
  { key: 'checkout', label: '🔗 Lien de paiement', sub: 'Le client clique un lien (Wave, OM, carte...)' },
  { key: 'wave',     label: '🌊 Wave direct',       sub: 'Push Wave sur le numéro du client' },
  { key: 'orange_money', label: '🟠 Orange Money direct', sub: 'Push OM sur le numéro du client' },
];

export default function EncaissementScreen({ navigation }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('amount'); // amount | provider | paydunya | confirm
  // État spécifique PayDunya SoftPay
  const [softpayProvider, setSoftpayProvider] = useState('checkout');
  const [customerPhone, setCustomerPhone] = useState('');

  useEffect(() => {
    merchantApi.getPaymentMethods().then((res) => {
      const enabled = res.data.paymentMethods.filter((p) => p.is_enabled);
      setProviders(enabled);
      if (enabled.length === 1) setSelectedProvider(enabled[0].provider);
    }).catch(() => {});
  }, []);

  const amountNumber = parseInt(amount.replace(/\D/g, '') || '0');

  const handleNext = () => {
    if (amountNumber < 1) { Alert.alert('Montant invalide', 'Entrez un montant supérieur à 0'); return; }
    if (providers.length === 1) {
      const p = providers[0].provider;
      setSelectedProvider(p);
      if (p === 'paydunya') setStep('paydunya');
      else setStep('confirm');
    } else setStep('provider');
  };

  const handleInitiate = async () => {
    if (!selectedProvider) return;
    // Validation numéro client si SoftPay direct
    if (selectedProvider === 'paydunya' && softpayProvider !== 'checkout' && !customerPhone.trim()) {
      Alert.alert('Numéro requis', 'Entrez le numéro de téléphone du client pour le paiement direct.');
      return;
    }
    setLoading(true);
    try {
      const clientReference = uuid.v4();
      const body = {
        amount: amountNumber,
        paymentProvider: selectedProvider,
        note: note.trim() || undefined,
        clientReference,
      };
      // PayDunya SoftPay
      if (selectedProvider === 'paydunya') {
        body.softpayProvider = softpayProvider;
        if (customerPhone.trim()) body.customerPhone = customerPhone.trim();
      }
      const res = await transactionApi.initiate(body);
      const { transaction, instructions, requiresManualConfirmation } = res.data;
      navigation.navigate('confirmation', {
        transactionId: transaction.id,
        amount: amountNumber,
        provider: selectedProvider,
        softpayProvider: selectedProvider === 'paydunya' ? softpayProvider : undefined,
        instructions: instructions || '',
        requiresManualConfirmation: !!requiresManualConfirmation,
      });
    } catch (err) {
      Alert.alert('Erreur', err.userMessage || 'Impossible de créer la transaction.');
    } finally {
      setLoading(false);
    }
  };

  // Étape 1 — Montant
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

  // Étape 2 — Choix provider
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
                key={pm.provider}
                style={[styles.providerCard, selectedProvider === pm.provider && styles.providerCardActive]}
                onPress={() => {
                  setSelectedProvider(pm.provider);
                  vibrate(50);
                  if (pm.provider === 'paydunya') setStep('paydunya');
                  else setStep('confirm');
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.providerIcon}>{PROVIDER_ICONS[pm.provider] || '💳'}</Text>
                <View style={styles.providerInfo}>
                  <Text style={styles.providerName}>{pm.display_name || PROVIDER_LABELS[pm.provider]}</Text>
                  <Text style={styles.providerSub}>
                    {pm.provider === 'cash' ? 'Paiement en espèces'
                     : pm.provider === 'paydunya' ? 'Wave, Orange Money, carte...'
                     : pm.provider === 'wave' ? 'Paiement Wave'
                     : 'Mobile Money'}
                  </Text>
                </View>
                <View style={[styles.providerCheck, selectedProvider === pm.provider && styles.providerCheckActive]}>
                  {selectedProvider === pm.provider && <Text style={{ color: Colors.white }}>✓</Text>}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Étape 2b — Configuration PayDunya (sous-provider + numéro client)
  if (step === 'paydunya') {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => setStep(providers.length > 1 ? 'provider' : 'amount')}>
            <Text style={styles.closeText}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.stepTitle}>💳 PayDunya</Text>
          <Text style={styles.amountSummary}>{formatAmount(amountNumber)}</Text>

          <Text style={styles.sectionLabel}>Mode de collecte</Text>
          {PAYDUNYA_SOFTPAY_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.providerCard, softpayProvider === opt.key && styles.providerCardActive]}
              onPress={() => { setSoftpayProvider(opt.key); vibrate(30); }}
              activeOpacity={0.85}
            >
              <View style={styles.providerInfo}>
                <Text style={styles.providerName}>{opt.label}</Text>
                <Text style={styles.providerSub}>{opt.sub}</Text>
              </View>
              <View style={[styles.providerCheck, softpayProvider === opt.key && styles.providerCheckActive]}>
                {softpayProvider === opt.key && <Text style={{ color: Colors.white }}>✓</Text>}
              </View>
            </TouchableOpacity>
          ))}

          {softpayProvider !== 'checkout' && (
            <View style={{ marginTop: Spacing.md }}>
              <Text style={styles.sectionLabel}>Numéro du client</Text>
              <TextInput
                style={styles.noteInput}
                value={customerPhone}
                onChangeText={setCustomerPhone}
                placeholder="+221 7X XXX XX XX"
                placeholderTextColor={Colors.gray400}
                keyboardType="phone-pad"
                maxLength={20}
              />
            </View>
          )}

          <Button
            title="Continuer"
            onPress={() => setStep('confirm')}
            size="xl"
            style={{ marginTop: Spacing.xl }}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Étape 3 — Confirmation
  const prevStep = selectedProvider === 'paydunya' ? 'paydunya' : providers.length > 1 ? 'provider' : 'amount';
  const softpayLabel = selectedProvider === 'paydunya'
    ? (PAYDUNYA_SOFTPAY_OPTIONS.find(o => o.key === softpayProvider)?.label || softpayProvider)
    : null;

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
              {PROVIDER_ICONS[selectedProvider]} {PROVIDER_LABELS[selectedProvider] || selectedProvider}
            </Text>
          </View>
          {softpayLabel && (
            <View style={styles.confirmRow}>
              <Text style={styles.confirmLabel}>Collecte via</Text>
              <Text style={styles.confirmValue}>{softpayLabel}</Text>
            </View>
          )}
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
  confirmCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.xl, marginBottom: Spacing.xl, ...Shadows.md },
  confirmAmount: { fontSize: 48, fontWeight: Typography.fontWeightExtrabold, color: Colors.primary, textAlign: 'center', marginBottom: Spacing.lg },
  confirmDivider: { height: 1, backgroundColor: Colors.border, marginBottom: Spacing.md },
  confirmRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm },
  confirmLabel: { fontSize: Typography.fontSizeMD, color: Colors.gray600 },
  confirmValue: { fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightSemibold, color: Colors.gray900 },
  sectionLabel: { fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightSemibold, color: Colors.gray500, textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.sm, marginTop: Spacing.md },
});
