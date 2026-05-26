import { Alert, Share } from 'react-native';
import dayjs from 'dayjs';
import { formatAmount, PROVIDER_LABELS } from './theme';

const STATUS_LABELS = {
  completed: 'Confirme',
  awaiting_confirmation: 'En attente',
  pending: 'En attente',
  cancelled: 'Annule',
  failed: 'Echoue',
  refunded: 'Rembourse',
};

export function normalizeTransaction(tx = {}) {
  return {
    id: tx.id,
    amount: Number(tx.amount || 0),
    provider: tx.paymentProvider || tx.payment_provider,
    status: tx.paymentStatus || tx.payment_status,
    note: tx.note,
    items: tx.itemsSnapshot || tx.items_snapshot || [],
    createdAt: tx.createdAt || tx.created_at,
    employeeName: tx.employeeName || tx.employee_name,
    cancelReason: tx.cancelReason || tx.cancel_reason,
  };
}

function getInvoiceLineLabel(item) {
  return item.type === 'manual' ? item.name : `${item.name} x${Number(item.qty || 0)}`;
}

export function buildReceiptText(input = {}) {
  const tx = normalizeTransaction(input);
  const date = dayjs(tx.createdAt || new Date()).format('DD/MM/YYYY HH:mm');
  const ref = tx.id?.slice(0, 8).toUpperCase() || '-';
  const providerLabel = PROVIDER_LABELS[tx.provider] || tx.provider || '-';
  const statusLabel = STATUS_LABELS[tx.status] || tx.status || '-';

  return [
    'Recu PayMe Africa',
    '---------------------',
    tx.items.length > 0 ? 'Facture :' : null,
    ...tx.items.map((item) => {
      const qty = Number(item.qty || 0);
      const price = Number(item.price || 0);
      return `${getInvoiceLineLabel(item)} : ${formatAmount(price * qty)}`;
    }),
    tx.items.length > 0 ? '---------------------' : null,
    `Montant : ${formatAmount(tx.amount)}`,
    `Mode    : ${providerLabel}`,
    `Statut  : ${statusLabel}`,
    `Date    : ${date}`,
    `Ref.    : ${ref}`,
    tx.employeeName ? `Vendeur : ${tx.employeeName}` : null,
    tx.note ? `Note    : ${tx.note}` : null,
    tx.cancelReason ? `Motif   : ${tx.cancelReason}` : null,
    '---------------------',
    'Merci pour votre achat !',
  ].filter(Boolean).join('\n');
}

export function buildReceiptTitle() {
  return 'Recu PayMe Africa';
}

export async function shareReceipt(input = {}) {
  const message = buildReceiptText(input);
  try {
    await Share.share({ message, title: buildReceiptTitle() });
  } catch (_) {
    Alert.alert('Recu a copier', message);
  }
}
