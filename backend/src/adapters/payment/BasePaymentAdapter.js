/**
 * Interface commune pour tous les adaptateurs de paiement
 * Chaque adaptateur DOIT implémenter ces méthodes
 */
class BasePaymentAdapter {
  constructor(config = {}) {
    this.config = config;
    this.provider = 'unknown';
  }

  /**
   * Initie un paiement
   * @returns { providerReference, status, instructions, redirectUrl? }
   */
  async initiate({ amount, currency, merchantId, customerPhone, reference, note }) {
    throw new Error(`initiate() non implémenté pour ${this.provider}`);
  }

  /**
   * Vérifie le statut d'un paiement
   * @returns { status: 'pending'|'completed'|'failed', providerStatus, providerResponse }
   */
  async checkStatus(providerReference) {
    throw new Error(`checkStatus() non implémenté pour ${this.provider}`);
  }

  /**
   * Traite un webhook entrant
   * @returns { status, providerReference, providerResponse }
   */
  async handleWebhook(payload, signature) {
    throw new Error(`handleWebhook() non implémenté pour ${this.provider}`);
  }

  /**
   * Si le provider supporte les remboursements
   */
  async refund(providerReference, amount) {
    throw { code: 'NON_SUPPORTE', message: `${this.provider} ne supporte pas les remboursements via API` };
  }

  isAvailable() {
    return true;
  }
}

module.exports = BasePaymentAdapter;
