const BasePaymentAdapter = require('./BasePaymentAdapter');

/**
 * Adaptateur Cash (espèces)
 * Le paiement est toujours confirmé manuellement par le commerçant
 */
class CashAdapter extends BasePaymentAdapter {
  constructor(config = {}) {
    super(config);
    this.provider = 'cash';
  }

  async initiate({ amount, currency, merchantId, reference, note }) {
    // Cash : pas d'API, on crée juste la transaction en attente
    return {
      providerReference: `cash-${reference}`,
      status: 'awaiting_confirmation',
      instructions: `Encaisser ${amount} ${currency} en espèces, puis confirmer.`,
      requiresManualConfirmation: true,
    };
  }

  async checkStatus(providerReference) {
    // Cash : statut toujours géré manuellement
    return {
      status: 'awaiting_confirmation',
      providerStatus: 'manual',
      providerResponse: {}
    };
  }

  async handleWebhook(payload, signature) {
    throw { code: 'NON_APPLICABLE', message: 'Cash n\'a pas de webhook' };
  }

  isAvailable() {
    return true;
  }
}

module.exports = CashAdapter;
