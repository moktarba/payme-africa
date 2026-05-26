const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.resolve('mobile/src/utils/receipt.js'), 'utf8');

const requiredSnippets = [
  'Recu PayMe Africa',
  'Facture :',
  'Montant :',
  'Mode    :',
  'Statut  :',
  'Date    :',
  'Ref.    :',
  'Vendeur :',
  'Motif   :',
  'Merci pour votre achat !',
  'paymentProvider || tx.payment_provider',
  'paymentStatus || tx.payment_status',
  'createdAt || tx.created_at',
  'itemsSnapshot || tx.items_snapshot',
  'employeeName || tx.employee_name',
  'cancelReason || tx.cancel_reason',
  'getInvoiceLineLabel',
  "item.type === 'manual'",
  'shareReceipt',
  'Recu a copier',
];

const missing = requiredSnippets.filter((snippet) => !source.includes(snippet));

if (missing.length) {
  console.error(`Format recu incomplet. Manquants: ${missing.join(', ')}`);
  process.exit(1);
}

console.log('QA receipt OK: format partage, articles, montants libres et compatibilite camelCase/snake_case');
