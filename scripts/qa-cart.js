const fs = require('fs');
const path = require('path');

const encaissement = fs.readFileSync(path.resolve('mobile/src/screens/main/EncaissementScreen.js'), 'utf8');
const confirmation = fs.readFileSync(path.resolve('mobile/src/screens/main/ConfirmationScreen.js'), 'utf8');
const api = fs.readFileSync(path.resolve('mobile/src/services/api.js'), 'utf8');

const checks = [
  [encaissement, 'const [cartItems, setCartItems]', 'etat panier'],
  [encaissement, 'contentContainerStyle={styles.scrollContent}', 'scroll vertical encaissement'],
  [encaissement, 'showsVerticalScrollIndicator', 'indicateur scroll souris'],
  [encaissement, 'buildItemsSnapshot', 'snapshot articles'],
  [encaissement, 'updateCartQty', 'modification quantite'],
  [encaissement, 'removeCartItem', 'suppression ligne'],
  [encaissement, 'manualAmount + cartTotal', 'total panier + montant libre'],
  [encaissement, 'commitManualAmount', 'addition de montants libres'],
  [encaissement, 'manualInvoiceLines', 'lignes facture montants libres'],
  [encaissement, "type: 'manual'", 'type ligne montant libre'],
  [encaissement, '...manualInvoiceLines', 'snapshot inclut montants libres'],
  [encaissement, "key === '+'", 'touche plus calculatrice'],
  [encaissement, 'Montants libres', 'affichage addition libre'],
  [encaissement, 'itemsSnapshot,', 'passage facture a confirmation'],
  [confirmation, 'itemsSnapshot = []', 'lecture facture confirmation'],
  [confirmation, 'getInvoiceLineLabel', 'libelle facture montant libre'],
  [confirmation, "item.type === 'manual'", 'affichage sans quantite montant libre'],
  [confirmation, 'buildReceiptText', 'partage recu'],
  [confirmation, 'de facture', 'compteur lignes facture'],
  [api, 'itemsSnapshot: data.itemsSnapshot', 'demo conserve les articles'],
];

const missing = checks.filter(([source, snippet]) => !source.includes(snippet));

if (missing.length) {
  console.error(`QA cart KO: ${missing.map(([, , label]) => label).join(', ')}`);
  process.exit(1);
}

console.log('QA cart OK: panier et montants libres cables dans encaissement, confirmation, recu et demo');
