const router  = require('express').Router();
const { db, logger } = require('../config/database');
const { getAdapter }  = require('../adapters/payment');
const { notifyTransactionConfirmed } = require('../services/notificationService');

/**
 * POST /webhooks/wave
 * Endpoint reçu par Wave après paiement confirmé côté client
 */
router.post('/wave', async (req, res) => {
  const signature = req.headers['x-wave-signature'] || req.headers['wave-signature'];
  try {
    const adapter = getAdapter('wave');
    const result  = await adapter.handleWebhook(req.body, signature);

    logger.info('Webhook Wave traité', result);

    // Trouver la transaction par référence client
    let tx = null;
    if (result.clientReference) {
      const { rows } = await db.query(
        `SELECT * FROM transactions WHERE client_reference = $1 LIMIT 1`,
        [result.clientReference]
      );
      tx = rows[0];
    }
    if (!tx && result.providerReference) {
      const { rows } = await db.query(
        `SELECT * FROM transactions WHERE provider_reference = $1 LIMIT 1`,
        [result.providerReference]
      );
      tx = rows[0];
    }

    if (!tx) {
      logger.warn('Webhook Wave: transaction introuvable', { clientRef: result.clientReference });
      return res.status(200).json({ received: true, warning: 'transaction_not_found' });
    }

    // Mettre à jour le statut
    if (result.status === 'completed' && tx.payment_status !== 'completed') {
      await db.query(
        `UPDATE transactions SET payment_status = 'completed', completed_at = NOW(),
         provider_reference = $1 WHERE id = $2`,
        [result.providerReference, tx.id]
      );
      await notifyTransactionConfirmed(tx.merchant_id, { ...tx, payment_provider: 'wave', amount: tx.amount });
      logger.info('Transaction confirmée via webhook Wave', { txId: tx.id });
    } else if (result.status === 'failed') {
      await db.query(
        `UPDATE transactions SET payment_status = 'failed' WHERE id = $1`,
        [tx.id]
      );
    }

    res.status(200).json({ received: true, txId: tx.id, status: result.status });
  } catch (err) {
    logger.error('Erreur webhook Wave', { error: err.message });
    res.status(err.code === 'SIGNATURE_INVALIDE' ? 401 : 500)
      .json({ success: false, message: err.message });
  }
});

/**
 * POST /webhooks/orange-money
 * Placeholder pour Orange Money
 */
router.post('/orange-money', async (req, res) => {
  logger.info('Webhook Orange Money reçu', { body: req.body });
  res.status(200).json({ received: true });
});

/**
 * POST /webhooks/free-money
 * Placeholder pour Free Money
 */
router.post('/free-money', async (req, res) => {
  logger.info('Webhook Free Money reçu', { body: req.body });
  res.status(200).json({ received: true });
});

module.exports = router;
