const BasePaymentAdapter = require('./BasePaymentAdapter');
const { logger } = require('../../config/database');

/**
 * Adaptateur Free Money Sénégal
 *
 * Phase 1 : mode semi-manuel
 *   Client compose *555# depuis son mobile Free ou utilise l'app
 *   Commerçant confirme après réception notification SMS
 *
 * Phase 2 : API Free Money Business (quand disponible)
 */
class FreeMoneyAdapter extends BasePaymentAdapter {
  constructor(config = {}) {
    super(config);
    this.provider   = 'free_money';
    this.apiKey     = config.apiKey || process.env.FREE_MONEY_API_KEY;
    this.merchantId = config.merchantId || process.env.FREE_MONEY_MERCHANT_ID;
    this.hasApi     = !!(this.apiKey && this.merchantId);
    this.ussdCode   = '*555#';
  }

  async initiate({ amount, currency, merchantPhone, reference }) {
    if (this.hasApi) return this._initiateViaApi({ amount, currency, merchantPhone, reference });
    return this._initiateManual({ amount, currency, merchantPhone, reference });
  }

  _initiateManual({ amount, currency, merchantPhone, reference }) {
    const amtFmt = Number(amount).toLocaleString('fr-FR');
    return {
      providerReference: `free-manual-${reference}`,
      status: 'awaiting_confirmation',
      mode: 'manual',
      instructions: merchantPhone
        ? `Demandez au client de composer ${this.ussdCode} ou d'utiliser l'app Free Money pour envoyer ${amtFmt} FCFA au ${merchantPhone}. Confirmez dès réception.`
        : `Client envoie ${amtFmt} FCFA via Free Money (${this.ussdCode}). Confirmez à réception.`,
      requiresManualConfirmation: true,
    };
  }

  async _initiateViaApi({ amount, currency, merchantPhone, reference }) {
    logger.warn('Free Money API non configurée, fallback manuel');
    return this._initiateManual({ amount, currency, merchantPhone, reference });
  }

  async checkStatus(providerReference) {
    return {
      status: 'awaiting_confirmation',
      providerStatus: 'manual',
      providerResponse: { mode: 'manual', provider: 'free_money' },
    };
  }

  async handleWebhook(payload) {
    logger.info('Free Money webhook reçu', { payload });
    return {
      status: 'completed',
      providerReference: payload.transactionId || payload.reference,
      providerResponse: payload,
    };
  }

  isAvailable() { return true; }
}

module.exports = FreeMoneyAdapter;
