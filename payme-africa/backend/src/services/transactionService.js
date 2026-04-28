const { v4: uuidv4 } = require('uuid');
const { db, logger } = require('../config/database');
const { getAdapter, isProviderEnabled } = require('../adapters/payment');
const dayjs = require('dayjs');

/**
 * Initier une transaction (encaissement)
 */
async function initiateTransaction({
  merchantId,
  amount,
  paymentProvider,
  note,
  customerName,
  customerPhone,
  itemsSnapshot,
  clientReference, // UUID généré côté mobile pour idempotence
  merchantPhone,
}) {
  // Validation montant
  if (!amount || amount <= 0) {
    throw { code: 'MONTANT_INVALIDE', message: 'Le montant doit être supérieur à 0.' };
  }

  if (amount > 5000000) { // 5M FCFA max
    throw { code: 'MONTANT_TROP_ELEVE', message: 'Montant trop élevé.' };
  }

  // Vérification provider activé
  if (!isProviderEnabled(paymentProvider)) {
    throw { code: 'PROVIDER_DESACTIVE', message: `${paymentProvider} n'est pas disponible.` };
  }

  // Idempotence : si la référence client existe déjà, retourner la transaction existante
  if (clientReference) {
    const existing = await db.query(
      'SELECT * FROM transactions WHERE client_reference = $1 AND merchant_id = $2',
      [clientReference, merchantId]
    );
    if (existing.rows.length > 0) {
      logger.info('Transaction idempotente retournée', { clientReference });
      return formatTransaction(existing.rows[0]);
    }
  }

  // Récupérer la config paiement du marchand
  const paymentMethodResult = await db.query(
    `SELECT config FROM merchant_payment_methods 
     WHERE merchant_id = $1 AND provider = $2 AND is_enabled = TRUE`,
    [merchantId, paymentProvider]
  );

  if (paymentMethodResult.rows.length === 0) {
    throw { code: 'METHODE_NON_ACTIVEE', message: `${paymentProvider} n'est pas activé sur votre compte.` };
  }

  const paymentConfig = paymentMethodResult.rows[0].config || {};

  // Récupérer la devise du marchand
  const merchantResult = await db.query(
    'SELECT currency FROM merchants WHERE id = $1',
    [merchantId]
  );
  const currency = merchantResult.rows[0]?.currency || 'XOF';

  // Initier via l'adaptateur
  const adapter = getAdapter(paymentProvider, paymentConfig);
  const adapterResult = await adapter.initiate({
    amount,
    currency,
    merchantId,
    merchantPhone,
    customerPhone,
    reference: clientReference || uuidv4(),
    note,
  });

  // Créer la transaction en base
  const transactionId = uuidv4();
  const { rows } = await db.query(
    `INSERT INTO transactions (
      id, merchant_id, client_reference, amount, currency,
      payment_provider, payment_status, provider_reference,
      note, customer_name, customer_phone, items_snapshot, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *`,
    [
      transactionId,
      merchantId,
      clientReference || transactionId,
      amount,
      currency,
      paymentProvider,
      adapterResult.status,
      adapterResult.providerReference,
      note || null,
      customerName || null,
      customerPhone || null,
      JSON.stringify(itemsSnapshot || []),
      merchantId,
    ]
  );

  logger.info('Transaction créée', { transactionId, provider: paymentProvider, amount });

  return {
    ...formatTransaction(rows[0]),
    instructions: adapterResult.instructions,
    requiresManualConfirmation: adapterResult.requiresManualConfirmation,
  };
}

/**
 * Confirmer manuellement une transaction (cash ou Wave semi-manuel)
 */
async function confirmTransaction(transactionId, merchantId) {
  const { rows } = await db.query(
    `SELECT * FROM transactions WHERE id = $1 AND merchant_id = $2`,
    [transactionId, merchantId]
  );

  if (rows.length === 0) {
    throw { code: 'TRANSACTION_INTROUVABLE', message: 'Transaction introuvable.' };
  }

  const tx = rows[0];

  if (tx.payment_status === 'completed') {
    return formatTransaction(tx); // Déjà complétée
  }

  if (!['pending', 'awaiting_confirmation'].includes(tx.payment_status)) {
    throw { code: 'STATUT_INVALIDE', message: `Impossible de confirmer une transaction en statut: ${tx.payment_status}` };
  }

  const { rows: updated } = await db.query(
    `UPDATE transactions 
     SET payment_status = 'completed', completed_at = NOW()
     WHERE id = $1 AND merchant_id = $2
     RETURNING *`,
    [transactionId, merchantId]
  );

  logger.info('Transaction confirmée', { transactionId, merchantId });

  return formatTransaction(updated[0]);
}

/**
 * Annuler une transaction
 */
async function cancelTransaction(transactionId, merchantId, reason = null) {
  const { rows } = await db.query(
    'SELECT * FROM transactions WHERE id = $1 AND merchant_id = $2',
    [transactionId, merchantId]
  );

  if (rows.length === 0) {
    throw { code: 'TRANSACTION_INTROUVABLE', message: 'Transaction introuvable.' };
  }

  if (rows[0].payment_status === 'completed') {
    throw { code: 'DEJA_COMPLETEE', message: 'Impossible d\'annuler une transaction déjà confirmée.' };
  }

  const { rows: updated } = await db.query(
    `UPDATE transactions 
     SET payment_status = 'cancelled', cancelled_at = NOW(), cancel_reason = $3
     WHERE id = $1 AND merchant_id = $2
     RETURNING *`,
    [transactionId, merchantId, reason]
  );

  return formatTransaction(updated[0]);
}

/**
 * Historique des transactions
 */
async function getTransactionHistory(merchantId, { limit = 20, offset = 0, dateFrom, dateTo, status } = {}) {
  let conditions = ['t.merchant_id = $1'];
  let params = [merchantId];
  let paramIndex = 2;

  if (dateFrom) {
    conditions.push(`t.created_at >= $${paramIndex++}`);
    params.push(dateFrom);
  }
  if (dateTo) {
    conditions.push(`t.created_at <= $${paramIndex++}`);
    params.push(dateTo);
  }
  if (status) {
    conditions.push(`t.payment_status = $${paramIndex++}`);
    params.push(status);
  }

  const where = conditions.join(' AND ');

  const { rows } = await db.query(
    `SELECT * FROM transactions t
     WHERE ${where}
     ORDER BY t.created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
    [...params, limit, offset]
  );

  const countResult = await db.query(
    `SELECT COUNT(*) FROM transactions t WHERE ${where}`,
    params
  );

  return {
    transactions: rows.map(formatTransaction),
    total: parseInt(countResult.rows[0].count),
    limit,
    offset,
  };
}

/**
 * Stats du jour (dashboard)
 */
async function getDayStats(merchantId) {
  const today = dayjs().format('YYYY-MM-DD');

  const { rows } = await db.query(
    `SELECT 
      COUNT(*) FILTER (WHERE payment_status = 'completed') as completed_count,
      SUM(amount) FILTER (WHERE payment_status = 'completed') as total_amount,
      COUNT(*) FILTER (WHERE payment_status = 'pending' OR payment_status = 'awaiting_confirmation') as pending_count,
      COUNT(*) FILTER (WHERE payment_status = 'cancelled') as cancelled_count,
      json_agg(json_build_object('provider', payment_provider, 'amount', amount, 'status', payment_status)
        ORDER BY created_at DESC) FILTER (WHERE payment_status = 'completed') as by_provider_raw
     FROM transactions
     WHERE merchant_id = $1 AND created_at::date = $2::date`,
    [merchantId, today]
  );

  const stats = rows[0];

  // Grouper par provider
  const byProvider = {};
  if (stats.by_provider_raw) {
    for (const tx of stats.by_provider_raw) {
      if (!byProvider[tx.provider]) {
        byProvider[tx.provider] = { count: 0, amount: 0 };
      }
      byProvider[tx.provider].count++;
      byProvider[tx.provider].amount += parseInt(tx.amount || 0);
    }
  }

  return {
    date: today,
    completedCount: parseInt(stats.completed_count || 0),
    totalAmount: parseInt(stats.total_amount || 0),
    pendingCount: parseInt(stats.pending_count || 0),
    cancelledCount: parseInt(stats.cancelled_count || 0),
    byProvider,
  };
}

function formatTransaction(tx) {
  return {
    id: tx.id,
    clientReference: tx.client_reference,
    amount: tx.amount,
    currency: tx.currency,
    paymentProvider: tx.payment_provider,
    paymentStatus: tx.payment_status,
    providerReference: tx.provider_reference,
    note: tx.note,
    customerName: tx.customer_name,
    customerPhone: tx.customer_phone,
    itemsSnapshot: tx.items_snapshot || [],
    completedAt: tx.completed_at,
    cancelledAt: tx.cancelled_at,
    cancelReason: tx.cancel_reason,
    createdAt: tx.created_at,
  };
}

module.exports = {
  initiateTransaction,
  confirmTransaction,
  cancelTransaction,
  getTransactionHistory,
  getDayStats,
};
