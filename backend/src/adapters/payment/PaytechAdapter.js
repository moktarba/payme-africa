'use strict';

const crypto = require('crypto');
const BasePaymentAdapter = require('./BasePaymentAdapter');
const { logger } = require('../../config/database');

/**
 * Adaptateur Paytech (paytech.sn)
 *
 * Flux :
 *   1. POST /api/payment/request-payment → obtenir token + redirect_url
 *   2. Rediriger le client vers redirect_url (page hosted Paytech)
 *   3. Paytech poste l'IPN sur ipn_url après paiement
 *
 * Providers supportés côté Paytech :
 *   Wave, Orange Money, Free Money, Expresso, Carte bancaire, PayPal, etc.
 *   (sélection faite par l'utilisateur sur la page de paiement Paytech)
 *
 * Sécurité IPN :
 *   api_key_sha256   = sha256(api_key)
 *   api_secret_sha256 = sha256(api_secret)
 *   → Vérifier les deux pour authentifier l'IPN.
 *
 * Docs : https://docs.intech.sn/doc_paytech.php
 */

const BASE_URL       = 'https://paytech.sn';
const REQUEST_PATH   = '/api/payment/request-payment';

// Mapping type_event Paytech → statuts internes
const STATUS_MAP = {
  payment_success:    'completed',
  payment_cancelled:  'failed',
  payment_failed:     'failed',
};

class PaytechAdapter extends BasePaymentAdapter {
  constructor(config = {}) {
    super(config);
    this.provider  = 'paytech';

    this.apiKey    = config.apiKey    || process.env.PAYTECH_API_KEY    || '';
    this.apiSecret = config.apiSecret || process.env.PAYTECH_API_SECRET || '';
    this.env       = config.env       || process.env.PAYTECH_ENV        || 'test'; // 'test' | 'prod'

    this.ipnUrl     = config.ipnUrl     || process.env.PAYTECH_IPN_URL     || 'https://api.faymafrica.fr/webhooks/paytech';
    this.successUrl = config.successUrl || process.env.PAYTECH_SUCCESS_URL || 'https://app.faymafrica.fr/?payment=success';
    this.cancelUrl  = config.cancelUrl  || process.env.PAYTECH_CANCEL_URL  || 'https://app.faymafrica.fr/?payment=cancelled';
  }

  // ─── Initier un paiement ─────────────────────────────────────────────────────

  /**
   * @param {Object} params
   * @param {number} params.amount          - Montant en FCFA
   * @param {string} params.reference       - UUID interne de la transaction (ref_command)
   * @param {string} [params.note]          - Description affichée sur la page Paytech
   * @param {string} [params.customerName]  - Nom du client (custom_field)
   * @param {string} [params.customerPhone] - Téléphone du client (custom_field)
   * @param {string} [params.storeName]     - Nom du commerce
   * @param {string} [params.currency]      - XOF par défaut
   * @returns {Promise<Object>}
   */
  async initiate({
    amount,
    reference,
    note,
    customerName,
    customerPhone,
    storeName,
    currency = 'XOF',
  }) {
    const itemName = note
      || `Paiement ${storeName || 'Payme Africa'} — ${amountFmt(amount)} ${currency}`;

    const customField = JSON.stringify({
      transaction_id: reference,
      customer_name:  customerName  || '',
      customer_phone: customerPhone || '',
    });

    const body = {
      item_name:    itemName,
      item_price:   amount,
      currency,
      ref_command:  reference,       // notre UUID → repris dans l'IPN
      ipn_url:      this.ipnUrl,
      success_url:  this.successUrl,
      cancel_url:   this.cancelUrl,
      api_key:      this.apiKey,
      api_secret:   this.apiSecret,
      env:          this.env,
      custom_field: customField,     // données custom récupérées dans l'IPN
    };

    let data;
    try {
      const res = await fetch(`${BASE_URL}${REQUEST_PATH}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body:    JSON.stringify(body),
      });
      data = await res.json().catch(() => ({}));

      if (!res.ok || data.success !== 1) {
        const msg = data.error || data.message || `Paytech HTTP ${res.status}`;
        logger.error('Paytech request-payment échec', { status: res.status, response: data });
        throw { code: 'PAYTECH_REQUEST_ERROR', message: msg };
      }
    } catch (err) {
      if (err.code) throw err;
      logger.error('Paytech erreur réseau', { error: err.message });
      throw { code: 'PAYTECH_NETWORK_ERROR', message: `Erreur réseau Paytech : ${err.message}` };
    }

    const token       = data.token;
    const redirectUrl = data.redirect_url
      || `${BASE_URL}/payment/checkout/${token}`;

    logger.info('Paytech paiement initié', {
      reference,
      token,
      redirectUrl,
      env: this.env,
      amount,
    });

    const sandboxPrefix = this.env === 'test' ? '[TEST] ' : '';

    return {
      providerReference:          token,
      status:                     'awaiting_confirmation',
      mode:                       this.env === 'test' ? 'test' : 'live',
      checkoutUrl:                redirectUrl,
      instructions:               `${sandboxPrefix}Envoyez ce lien au client pour payer ${amountFmt(amount)} FCFA via Paytech (Wave, Orange Money, Free Money…) : ${redirectUrl}`,
      requiresManualConfirmation: false,
      providerResponse:           data,
    };
  }

  // ─── Vérifier le statut (polling) ───────────────────────────────────────────

  /**
   * Paytech ne fournit pas d'endpoint de vérification de statut direct.
   * On retourne pending en attendant l'IPN.
   */
  async checkStatus(providerReference) {
    logger.info('Paytech checkStatus : pas d\'endpoint de polling disponible', { providerReference });
    return {
      status:          'pending',
      providerStatus:  'unknown',
      providerResponse: { token: providerReference },
    };
  }

  // ─── Traitement de l'IPN ────────────────────────────────────────────────────

  /**
   * Paytech poste : POST application/x-www-form-urlencoded
   *
   * Champs importants :
   *   type_event       : 'payment_success' | 'payment_cancelled' | 'payment_failed'
   *   ref_command      : notre UUID de transaction
   *   token            : token Paytech
   *   item_name        : description
   *   item_price       : montant
   *   currency         : 'XOF'
   *   api_key_sha256   : sha256(apiKey) — vérification authenticité
   *   api_secret_sha256: sha256(apiSecret) — vérification authenticité
   *   custom_field     : JSON stringifié avec transaction_id, customer_*
   *
   * @param {Object} payload - req.body (parsé par express.urlencoded)
   * @returns {Promise<Object>}
   * @throws { code: 'SIGNATURE_INVALIDE' }
   */
  async handleWebhook(payload) {
    const {
      type_event,
      ref_command,
      token,
      item_price,
      currency,
      api_key_sha256,
      api_secret_sha256,
      custom_field,
    } = payload;

    // ── Vérification de signature ────────────────────────────────────────────
    if (this.apiKey && this.apiSecret) {
      const expectedKeyHash    = crypto.createHash('sha256').update(this.apiKey).digest('hex');
      const expectedSecretHash = crypto.createHash('sha256').update(this.apiSecret).digest('hex');

      if (api_key_sha256 !== expectedKeyHash || api_secret_sha256 !== expectedSecretHash) {
        logger.warn('Paytech IPN : signature invalide', {
          received_key_hash:    api_key_sha256?.slice(0, 12) + '…',
          expected_key_hash:    expectedKeyHash?.slice(0, 12) + '…',
        });
        throw { code: 'SIGNATURE_INVALIDE', message: 'Signature IPN Paytech invalide.' };
      }
    } else {
      logger.warn('Paytech IPN reçu sans clés configurées — non vérifié', { type_event });
    }

    // ── Extraction du transaction_id ─────────────────────────────────────────
    let transactionId = ref_command;
    if (custom_field) {
      try {
        const customData = JSON.parse(custom_field);
        transactionId = customData.transaction_id || ref_command;
      } catch (_) {
        // custom_field non JSON → utiliser ref_command
      }
    }

    const internalStatus = STATUS_MAP[type_event] || 'pending';

    logger.info('Paytech IPN reçu', {
      type_event,
      ref_command,
      token,
      transactionId,
      internalStatus,
      amount: item_price,
      currency,
    });

    return {
      status:            internalStatus,
      providerReference: token,
      transactionId,                     // UUID de notre transaction en base
      amount:            Number(item_price),
      currency,
      providerResponse:  payload,
    };
  }

  /**
   * @returns {boolean} - true si les clés sont configurées
   */
  isAvailable() {
    return !!(this.apiKey && this.apiSecret);
  }
}

// ─── Helper ─────────────────────────────────────────────────────────────────

function amountFmt(amount) {
  return Number(amount).toLocaleString('fr-FR');
}

module.exports = PaytechAdapter;
