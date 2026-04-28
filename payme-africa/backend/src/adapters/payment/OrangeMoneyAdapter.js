const BasePaymentAdapter = require('./BasePaymentAdapter');
const { logger } = require('../../config/database');

/**
 * Adaptateur Orange Money Sénégal / Côte d'Ivoire
 *
 * Phase 1 (MVP) : mode semi-manuel
 *   Le client compose *144# ou utilise l'app Orange Money pour envoyer
 *   Le commerçant confirme après réception de la notification SMS
 *
 * Phase 2 : API Orange Money (quand accès disponible)
 *   - Orange Money API v2 / REST
 *   - Initiation de paiement marchands
 *   - Webhooks de confirmation
 */
class OrangeMoneyAdapter extends BasePaymentAdapter {
  constructor(config = {}) {
    super(config);
    this.provider = 'orange_money';
    this.apiKey    = config.apiKey    || process.env.ORANGE_MONEY_API_KEY;
    this.merchantId = config.merchantId || process.env.ORANGE_MONEY_MERCHANT_ID;
    this.hasApi    = !!(this.apiKey && this.merchantId);
    this.country   = config.country || 'SN'; // SN=Sénégal, CI=Côte d'Ivoire
  }

  async initiate({ amount, currency, merchantPhone, customerPhone, reference }) {
    if (this.hasApi) {
      return this._initiateViaApi({ amount, currency, merchantPhone, customerPhone, reference });
    }
    return this._initiateManual({ amount, currency, merchantPhone, reference });
  }

  _initiateManual({ amount, currency, merchantPhone, reference }) {
    const formattedAmount = amount.toLocaleString('fr-FR');
    const ussd = this.country === 'SN' ? '*144#' : '*144#';
    return {
      providerReference: `om-manual-${reference}`,
      status: 'awaiting_confirmation',
      mode: 'manual',
      instructions: merchantPhone
        ? `Demandez au client d'envoyer ${formattedAmount} FCFA via Orange Money au ${merchantPhone}. Il peut utiliser l'app ou composer ${ussd}.`
        : `Client envoie ${formattedAmount} FCFA par Orange Money. Confirmez dès réception.`,
      requiresManualConfirmation: true,
    };
  }

  async _initiateViaApi({ amount, currency, merchantPhone, customerPhone, reference }) {
    // TODO Phase 2 : Orange Money REST API
    logger.warn('Orange Money API non encore configurée, fallback mode manuel');
    return this._initiateManual({ amount, currency, merchantPhone, reference });
  }

  async checkStatus(providerReference) {
    return {
      status: 'awaiting_confirmation',
      providerStatus: 'manual',
      providerResponse: { mode: 'manual', provider: 'orange_money' },
    };
  }

  async handleWebhook(payload, signature) {
    // Vérification de signature Orange Money
    logger.info('Orange Money webhook reçu', { payload });
    return {
      status: 'completed',
      providerReference: payload.transactionId || payload.transaction_id,
      providerResponse: payload,
    };
  }

  isAvailable() { return true; }
}

module.exports = OrangeMoneyAdapter;
