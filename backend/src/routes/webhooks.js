'use strict';

/**
 * Routes Webhooks — Notifications entrantes des providers de paiement
 *
 * ⚠️  Ces routes ne portent PAS le middleware authenticate.
 *     Les requêtes viennent des serveurs PayDunya / Wave, sans token JWT.
 *     La sécurité repose exclusivement sur la vérification de hash/signature
 *     à l'intérieur de chaque adapter.
 *
 * POST /webhooks/paydunya  — IPN PayDunya (urlencoded)
 * POST /webhooks/wave      — Webhook Wave Business (JSON + HMAC-SHA256)
 */

const router  = require('express').Router();
const { logger } = require('../config/database');
const { getAdapter } = require('../adapters/payment');
const { confirmTransaction, cancelTransaction } = require('../services/transactionService');
const { db } = require('../config/database');

// ─── POST /webhooks/paydunya ─────────────────────────────────────────────────

/**
 * IPN PayDunya
 *
 * PayDunya envoie : POST application/x-www-form-urlencoded
 * Payload sous la clé "data".
 * Hash = SHA-512(masterKey) pour vérifier l'authenticité.
 *
 * custom_data.transaction_id contient notre UUID interne.
 * PayDunya rejoue l'IPN jusqu'à recevoir HTTP 200 — le handler est idempotent.
 */
router.post('/paydunya', async (req, res) => {
  // Répondre 200 immédiatement pour éviter les retentatives PayDunya
  // La logique de traitement tourne en async
  res.sendStatus(200);

  try {
    const adapter = getAdapter('paydunya');
    const result  = await adapter.handleWebhook(req.body);

    const { status, transactionId, providerReference, receiptUrl } = result;

    if (!transactionId) {
      logger.warn('PayDunya IPN : transaction_id absent du custom_data', {
        providerReference,
        status,
      });
      return;
    }

    // Vérifier que la transaction existe et est encore en attente
    const { rows } = await db.query(
      `SELECT id, payment_status FROM transactions WHERE id = $1`,
      [transactionId],
    );

    if (rows.length === 0) {
      logger.warn('PayDunya IPN : transaction introuvable en base', { transactionId });
      return;
    }

    const tx = rows[0];

    // Idempotence : ne pas retraiter une transaction déjà finalisée
    if (tx.payment_status === 'completed' || tx.payment_status === 'cancelled') {
      logger.info('PayDunya IPN : transaction déjà finalisée, ignorée', {
        transactionId,
        currentStatus: tx.payment_status,
        receivedStatus: status,
      });
      return;
    }

    if (status === 'completed') {
      await confirmTransaction(transactionId, null, { fromWebhook: true });
      logger.info('PayDunya IPN : transaction confirmée', { transactionId, providerReference });
    } else if (status === 'failed') {
      await cancelTransaction(transactionId, null, 'Annulé ou échoué via IPN PayDunya', { fromWebhook: true });
      logger.info('PayDunya IPN : transaction annulée/échouée', { transactionId, providerReference });
    } else {
      // status = 'pending' → pas d'action, attendre la prochaine notification
      logger.info('PayDunya IPN : statut pending, aucune action', { transactionId, status });
    }

  } catch (err) {
    // Ne pas propager : la réponse 200 est déjà envoyée
    if (err.code === 'HASH_INVALIDE') {
      logger.error('PayDunya IPN : signature invalide — requête rejetée', { error: err.message });
    } else {
      logger.error('PayDunya IPN : erreur de traitement', {
        error:   err.message,
        code:    err.code,
        stack:   err.stack,
      });
    }
  }
});

// ─── POST /webhooks/wave ─────────────────────────────────────────────────────

/**
 * Webhook Wave Business
 *
 * Wave envoie : POST application/json
 * Signature HMAC-SHA256 dans l'en-tête X-Wave-Signature (ou similaire).
 * Vérification déléguée à WaveAdapter.handleWebhook().
 *
 * Le champ client_reference contient notre UUID de transaction.
 */
router.post('/wave', async (req, res) => {
  res.sendStatus(200);

  try {
    const adapter = getAdapter('wave');

    // Wave envoie la signature dans les headers
    const signature = req.headers['x-wave-signature']
      || req.headers['wave-signature']
      || null;

    const result = await adapter.handleWebhook(req.body, signature);

    const { status, clientReference } = result;   // clientReference = notre transaction_id

    if (!clientReference) {
      logger.warn('Wave webhook : client_reference absent', { status });
      return;
    }

    // Retrouver la transaction via provider_reference ou client_reference
    const { rows } = await db.query(
      `SELECT id, payment_status
       FROM transactions
       WHERE id = $1 OR provider_reference = $2
       LIMIT 1`,
      [clientReference, result.providerReference],
    );

    if (rows.length === 0) {
      logger.warn('Wave webhook : transaction introuvable', { clientReference });
      return;
    }

    const tx = rows[0];

    if (tx.payment_status === 'completed' || tx.payment_status === 'cancelled') {
      logger.info('Wave webhook : transaction déjà finalisée, ignorée', {
        transactionId: tx.id,
        currentStatus: tx.payment_status,
      });
      return;
    }

    if (status === 'completed') {
      await confirmTransaction(tx.id, null, { fromWebhook: true });
      logger.info('Wave webhook : transaction confirmée', { transactionId: tx.id });
    } else if (status === 'failed') {
      await cancelTransaction(tx.id, null, 'Échec Wave webhook', { fromWebhook: true });
      logger.info('Wave webhook : transaction échouée', { transactionId: tx.id });
    }

  } catch (err) {
    if (err.code === 'SIGNATURE_INVALIDE') {
      logger.error('Wave webhook : signature invalide', { error: err.message });
    } else {
      logger.error('Wave webhook : erreur de traitement', {
        error: err.message,
        code:  err.code,
      });
    }
  }
});

module.exports = router;
