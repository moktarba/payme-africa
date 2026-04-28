const BasePaymentAdapter = require('./BasePaymentAdapter');
const { logger } = require('../../config/database');

/**
 * Adaptateur Wave CI/Sénégal
 * 
 * Phase 1 (MVP) : Mode semi-manuel
 * Le commerçant demande à son client d'envoyer de l'argent sur son numéro Wave,
 * puis confirme manuellement la réception.
 * 
 * Phase 2 : Intégration API Wave Business (quand accès disponible)
 */
class WaveAdapter extends BasePaymentAdapter {
  constructor(config = {}) {
    super(config);
    this.provider = 'wave';
    this.apiKey = config.apiKey || process.env.WAVE_API_KEY;
    this.merchantId = config.merchantId || process.env.WAVE_MERCHANT_ID;
    this.hasApiAccess = !!(this.apiKey && this.merchantId);
  }

  async initiate({ amount, currency, merchantPhone, customerPhone, reference, note }) {
    if (this.hasApiAccess) {
      return this._initiateViaApi({ amount, currency, merchantPhone, customerPhone, reference, note });
    }
    return this._initiateManual({ amount, currency, merchantPhone, reference });
  }

  /**
   * Mode semi-manuel : afficher les instructions au client
   */
  _initiateManual({ amount, currency, merchantPhone, reference }) {
    const formattedAmount = amount.toLocaleString('fr-FR');
    
    return {
      providerReference: `wave-manual-${reference}`,
      status: 'awaiting_confirmation',
      mode: 'manual',
      instructions: merchantPhone
        ? `Demandez au client d'envoyer ${formattedAmount} FCFA sur Wave au ${merchantPhone}. Confirmez dès réception.`
        : `Demandez au client d'envoyer ${formattedAmount} FCFA par Wave. Confirmez dès réception.`,
      requiresManualConfirmation: true,
    };
  }

  /**
   * Mode API Wave Business (phase 2)
   */
  async _initiateViaApi({ amount, currency, merchantPhone, customerPhone, reference, note }) {
    // TODO Phase 2 : appel API Wave
    // Pour l'instant, fallback sur le mode manuel
    logger.warn('Wave API non encore configurée, fallback mode manuel');
    return this._initiateManual({ amount, currency, merchantPhone, reference });
  }

  async checkStatus(providerReference) {
    if (providerReference.includes('manual')) {
      return {
        status: 'awaiting_confirmation',
        providerStatus: 'manual',
        providerResponse: { mode: 'manual' }
      };
    }

    // Phase 2 : vérifier via API Wave
    return {
      status: 'awaiting_confirmation',
      providerStatus: 'unknown',
      providerResponse: {}
    };
  }

  async handleWebhook(payload, signature) {
    // Phase 2 : vérifier signature Wave et parser payload
    logger.info('Wave webhook reçu', { payload });
    return {
      status: 'completed',
      providerReference: payload.transaction_id,
      providerResponse: payload
    };
  }

  isAvailable() {
    return true; // Wave toujours disponible en mode manuel
  }
}

module.exports = WaveAdapter;
