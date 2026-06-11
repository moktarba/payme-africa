'use strict';

const crypto = require('crypto');
const BasePaymentAdapter = require('./BasePaymentAdapter');
const { logger } = require('../../config/database');

/**
 * Adaptateur PayDunya — API SoftPay
 *
 * Flux en deux étapes :
 *   1. Créer une facture (checkout-invoice/create) → obtenir un invoice_token
 *   2. Déclencher le paiement sur le provider mobile (softpay/<provider>)
 *
 * Providers Sénégal supportés :
 *   wave         → /softpay/wave-senegal        (retourne un deep link Wave)
 *   orange_money → /softpay/new-orange-money-senegal (QR code + deep link OM)
 *   free_money   → /softpay/free-money-senegal  (push USSD #150#)
 *   expresso     → /softpay/expresso-senegal    (SMS de validation)
 *
 * IPN (Instant Payment Notification) :
 *   PayDunya poste application/x-www-form-urlencoded sur callback_url.
 *   Le hash = SHA-512(masterKey) permet de vérifier l'authenticité.
 *   Le champ custom_data.transaction_id contient notre UUID interne.
 *
 * Docs : https://developers.paydunya.com/doc/FR/softpay
 */

// Mapping provider interne → endpoint SoftPay PayDunya
const SOFTPAY_ENDPOINTS = {
  wave:         '/softpay/wave-senegal',
  orange_money: '/softpay/new-orange-money-senegal',
  free_money:   '/softpay/free-money-senegal',
  expresso:     '/softpay/expresso-senegal',
};

// Mapping statuts PayDunya → statuts internes Payme Africa
const STATUS_MAP = {
  completed: 'completed',
  pending:   'pending',
  cancelled: 'failed',
  failed:    'failed',
};

class PayDunyaAdapter extends BasePaymentAdapter {
  constructor(config = {}) {
    super(config);
    this.provider = 'paydunya';

    this.masterKey  = config.masterKey  || process.env.PAYDUNYA_MASTER_KEY  || '';
    this.privateKey = config.privateKey || process.env.PAYDUNYA_PRIVATE_KEY || '';
    this.token      = config.token      || process.env.PAYDUNYA_TOKEN       || '';
    this.mode       = config.mode       || process.env.PAYDUNYA_MODE        || 'test';
    this.callbackUrl = config.callbackUrl || process.env.PAYDUNYA_CALLBACK_URL || '';

    // URLs de base selon le mode
    this.baseUrl = this.mode === 'live'
      ? 'https://app.paydunya.com/api/v1'
      : 'https://app.paydunya.com/sandbox-api/v1';
  }

  // ─── Headers communs ────────────────────────────────────────────────────────

  _headers() {
    return {
      'Content-Type':         'application/json',
      'PAYDUNYA-MASTER-KEY':  this.masterKey,
      'PAYDUNYA-PRIVATE-KEY': this.privateKey,
      'PAYDUNYA-TOKEN':       this.token,
    };
  }

  // ─── Étape 1 : Créer la facture ─────────────────────────────────────────────

  /**
   * Crée un checkout invoice PayDunya.
   * Retourne le token de facture utilisé dans toutes les étapes suivantes.
   *
   * @param {Object} opts
   * @param {number} opts.amount           - Montant en FCFA
   * @param {string} opts.description      - Description affichée sur la facture
   * @param {string} opts.storeName        - Nom du commerce
   * @param {string} opts.transactionId    - Notre UUID interne (stocké dans custom_data)
   * @param {string} [opts.customerName]
   * @param {string} [opts.customerPhone]
   * @param {string} [opts.customerEmail]
   * @returns {Promise<string>}            - invoice_token PayDunya
   */
  async _createInvoice({ amount, description, storeName, transactionId,
                         customerName, customerPhone, customerEmail }) {
    const body = {
      invoice: {
        total_amount: amount,
        description:  description || `Paiement Payme Africa — ${storeName}`,
        ...(customerName || customerPhone ? {
          customer: {
            name:  customerName  || '',
            phone: customerPhone || '',
            email: customerEmail || '',
          },
        } : {}),
      },
      store: {
        name: storeName || 'Payme Africa',
      },
      custom_data: {
        transaction_id: transactionId,   // clé de réconciliation lors de l'IPN
      },
      actions: {
        callback_url: this.callbackUrl,
      },
    };

    const res = await fetch(`${this.baseUrl}/checkout-invoice/create`, {
      method:  'POST',
      headers: this._headers(),
      body:    JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.response_code !== '00') {
      const msg = data.response_text || `PayDunya /checkout-invoice/create HTTP ${res.status}`;
      logger.error('PayDunya createInvoice échec', { status: res.status, response: data });
      throw { code: 'PAYDUNYA_INVOICE_ERROR', message: msg };
    }

    logger.info('PayDunya invoice créée', { invoiceToken: data.token, amount, transactionId });
    return data.token;
  }

  // ─── Étape 2 : Déclencher le paiement SoftPay ───────────────────────────────

  /**
   * Déclenche le paiement SoftPay sur le provider choisi.
   *
   * @param {string} softpayProvider - 'wave' | 'orange_money' | 'free_money' | 'expresso'
   * @param {string} invoiceToken    - token obtenu à l'étape 1
   * @param {Object} opts
   * @param {string} opts.customerName
   * @param {string} opts.customerPhone
   * @returns {Promise<Object>}      - réponse brute PayDunya
   */
  async _triggerSoftPay(softpayProvider, invoiceToken, { customerName, customerPhone }) {
    const endpoint = SOFTPAY_ENDPOINTS[softpayProvider];
    if (!endpoint) {
      throw {
        code:    'PAYDUNYA_PROVIDER_INCONNU',
        message: `Provider SoftPay non supporté : ${softpayProvider}. Valeurs acceptées : ${Object.keys(SOFTPAY_ENDPOINTS).join(', ')}`,
      };
    }

    // Chaque provider a un schéma de payload légèrement différent (noms de champs distincts)
    const payload = this._buildSoftPayPayload(softpayProvider, invoiceToken, {
      customerName,
      customerPhone,
    });

    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method:  'POST',
      headers: this._headers(),
      body:    JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.success === false) {
      const msg = data.message || `PayDunya SoftPay ${softpayProvider} HTTP ${res.status}`;
      logger.warn('PayDunya SoftPay échec', { provider: softpayProvider, invoiceToken, response: data });
      throw { code: 'PAYDUNYA_SOFTPAY_ERROR', message: msg };
    }

    logger.info('PayDunya SoftPay déclenché', {
      provider:     softpayProvider,
      invoiceToken,
      hasUrl:       !!(data.url || data.om_url),
    });

    return data;
  }

  /**
   * Construit le payload SoftPay selon les conventions de champs propres à chaque provider.
   * La doc PayDunya utilise des noms de champs différents par provider (non standardisés).
   */
  _buildSoftPayPayload(provider, invoiceToken, { customerName, customerPhone }) {
    const name  = customerName  || 'Client';
    const phone = customerPhone || '';
    const email = '';   // facultatif partout

    switch (provider) {
      case 'wave':
        return {
          wave_senegal_fullName:      name,
          wave_senegal_email:         email,
          wave_senegal_phone:         phone,
          wave_senegal_payment_token: invoiceToken,
        };

      case 'orange_money':
        return {
          customer_name:  name,
          customer_email: email,
          phone_number:   phone,
          invoice_token:  invoiceToken,
        };

      case 'free_money':
        return {
          customer_name:  name,
          customer_email: email,
          phone_number:   phone,
          payment_token:  invoiceToken,
        };

      case 'expresso':
        return {
          expresso_sn_fullName: name,
          expresso_sn_email:    email,
          expresso_sn_phone:    phone,
          payment_token:        invoiceToken,
        };

      default:
        throw { code: 'PAYDUNYA_PROVIDER_INCONNU', message: `Provider inconnu : ${provider}` };
    }
  }

  // ─── Instructions lisibles par le commerçant ─────────────────────────────────

  _buildInstructions(provider, softpayResponse, amount) {
    const amtFmt = Number(amount).toLocaleString('fr-FR');

    switch (provider) {
      case 'wave':
        return softpayResponse.url
          ? `Envoyez ce lien Wave au client pour qu'il valide le paiement de ${amtFmt} FCFA.`
          : `Demandez au client de payer ${amtFmt} FCFA via Wave. Confirmation automatique.`;

      case 'orange_money':
        return softpayResponse.om_url
          ? `Envoyez ce lien au client pour payer ${amtFmt} FCFA via Orange Money.`
          : `Demandez au client de valider le paiement de ${amtFmt} FCFA sur son app Orange Money.`;

      case 'free_money':
        return `Le client va recevoir une notification pour valider ${amtFmt} FCFA via Free Money (#150#).`;

      case 'expresso':
        return `Un SMS a été envoyé au client pour valider le paiement de ${amtFmt} FCFA via Expresso.`;

      default:
        return `Paiement de ${amtFmt} FCFA via PayDunya en cours de traitement.`;
    }
  }

  // ─── Interface publique ──────────────────────────────────────────────────────

  /**
   * Initie un paiement PayDunya SoftPay.
   *
   * @param {Object} params
   * @param {number} params.amount
   * @param {string} [params.currency='XOF']
   * @param {string} params.merchantId
   * @param {string} [params.merchantPhone]
   * @param {string} [params.customerName]
   * @param {string} [params.customerPhone]
   * @param {string} params.reference      - Notre UUID de transaction (idempotence)
   * @param {string} [params.note]
   * @param {string} [params.storeName]
   * @param {string} [params.softpayProvider='wave'] - Provider SoftPay cible
   *
   * @returns {Promise<Object>} - { providerReference, status, mode, checkoutUrl,
   *                               instructions, requiresManualConfirmation, providerResponse }
   */
  async initiate({
    amount,
    currency = 'XOF',
    merchantId,
    merchantPhone,
    customerName,
    customerPhone,
    reference,
    note,
    storeName,
    softpayProvider = 'wave',
  }) {
    // Étape 1 : créer la facture PayDunya
    const invoiceToken = await this._createInvoice({
      amount,
      description:  note || `Paiement ${amountFmt(amount)} FCFA`,
      storeName:    storeName || 'Payme Africa',
      transactionId: reference,
      customerName,
      customerPhone,
    });

    // Étape 2 : déclencher le SoftPay
    const softpayResponse = await this._triggerSoftPay(softpayProvider, invoiceToken, {
      customerName,
      customerPhone,
    });

    // URL de paiement : Wave et OM retournent un deep link
    const checkoutUrl = softpayResponse.url
      || softpayResponse.om_url
      || null;

    return {
      providerReference:          invoiceToken,   // token PayDunya = clé de polling + IPN
      status:                     'awaiting_confirmation',
      mode:                       'api',
      checkoutUrl,
      instructions:               this._buildInstructions(softpayProvider, softpayResponse, amount),
      requiresManualConfirmation: false,
      providerResponse:           softpayResponse,
    };
  }

  /**
   * Vérifie le statut d'une transaction via polling.
   * À utiliser si l'IPN n'est pas reçu dans les délais attendus.
   *
   * @param {string} providerReference - invoice_token PayDunya
   * @returns {Promise<Object>} - { status, providerStatus, receiptUrl, providerResponse }
   */
  async checkStatus(providerReference) {
    try {
      const res = await fetch(
        `${this.baseUrl}/checkout-invoice/confirm/${providerReference}`,
        { method: 'GET', headers: this._headers() },
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.response_code !== '00') {
        logger.warn('PayDunya checkStatus réponse inattendue', {
          providerReference,
          status: res.status,
          response_code: data.response_code,
        });
        return { status: 'pending', providerStatus: 'unknown', providerResponse: data };
      }

      const internalStatus = STATUS_MAP[data.status] || 'pending';

      logger.info('PayDunya checkStatus', {
        providerReference,
        paydunyaStatus: data.status,
        internalStatus,
      });

      return {
        status:          internalStatus,
        providerStatus:  data.status,
        receiptUrl:      data.receipt_url || null,
        providerResponse: data,
      };
    } catch (err) {
      logger.error('PayDunya checkStatus erreur réseau', {
        providerReference,
        error: err.message,
      });
      return { status: 'pending', providerStatus: 'error', providerResponse: {} };
    }
  }

  /**
   * Traite un IPN (Instant Payment Notification) PayDunya.
   *
   * PayDunya envoie : POST application/x-www-form-urlencoded
   * Le payload est sous la clé "data" (tableau ou objet selon le framework).
   * Le hash = SHA-512(masterKey) — permet de vérifier l'authenticité.
   *
   * @param {Object} payload  - req.body déjà parsé par express.urlencoded()
   * @returns {Promise<Object>} - { status, providerReference, transactionId,
   *                               amount, providerResponse }
   * @throws  { code: 'HASH_INVALIDE' }  si la signature ne correspond pas
   */
  async handleWebhook(payload) {
    // PayDunya envoie les données sous la clé "data"
    const data = payload.data || payload;

    // ── Vérification du hash ─────────────────────────────────────────────────
    // Le hash reçu = SHA-512(masterKey)
    if (data.hash && this.masterKey) {
      const expectedHash = crypto
        .createHash('sha512')
        .update(this.masterKey)
        .digest('hex');

      if (data.hash !== expectedHash) {
        logger.warn('PayDunya IPN hash invalide', {
          received: data.hash?.slice(0, 16) + '…',
          expected: expectedHash?.slice(0, 16) + '…',
        });
        throw { code: 'HASH_INVALIDE', message: 'Signature IPN PayDunya invalide.' };
      }
    } else {
      // Pas de hash = IPN non signé (possible en sandbox) — logger un avertissement
      logger.warn('PayDunya IPN reçu sans hash — non vérifié', {
        mode: this.mode,
        status: data.status,
      });
    }

    // ── Extraction des données ───────────────────────────────────────────────
    const invoice       = data.invoice     || {};
    const customData    = data.custom_data || {};
    const invoiceToken  = invoice.token    || data.token;
    const transactionId = customData.transaction_id;       // notre UUID interne
    const paydunyaStatus = data.status;                    // completed | pending | cancelled | failed
    const internalStatus = STATUS_MAP[paydunyaStatus] || 'pending';

    logger.info('PayDunya IPN reçu', {
      invoiceToken,
      transactionId,
      paydunyaStatus,
      internalStatus,
      mode: data.mode,
    });

    return {
      status:            internalStatus,
      providerReference: invoiceToken,
      transactionId,                       // UUID de notre transaction en base
      amount:            invoice.total_amount,
      receiptUrl:        data.receipt_url || null,
      providerResponse:  data,
    };
  }

  /**
   * Retourne true si les clés sont configurées.
   */
  isAvailable() {
    return !!(this.masterKey && this.privateKey && this.token);
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function amountFmt(amount) {
  return Number(amount).toLocaleString('fr-FR');
}

module.exports = PayDunyaAdapter;
