const BasePaymentAdapter = require('./BasePaymentAdapter');
const { logger } = require('../../config/database');
const crypto = require('crypto');

/**
 * Adaptateur Wave CI / Sénégal
 *
 * Phase 1 (actuel) : mode semi-manuel
 * Phase 2 (ce sprint) : Wave Business API v2
 *   - Checkout sessions
 *   - Webhooks de confirmation
 *   - Vérification signature HMAC
 */
class WaveAdapter extends BasePaymentAdapter {
  constructor(config = {}) {
    super(config);
    this.provider   = 'wave';
    this.apiKey     = config.apiKey     || process.env.WAVE_API_KEY;
    this.webhookSecret = config.webhookSecret || process.env.WAVE_WEBHOOK_SECRET;
    this.baseUrl    = 'https://api.wave.com/v1';
    this.hasApi     = !!this.apiKey;
  }

  async initiate({ amount, currency = 'XOF', merchantPhone, reference, callbackUrl, clientName }) {
    if (this.hasApi) {
      return this._initiateCheckout({ amount, currency, reference, callbackUrl, clientName });
    }
    return this._initiateManual({ amount, currency, merchantPhone, reference });
  }

  /**
   * Wave Business API — Checkout session
   * Docs: https://docs.wave.com/api-reference/checkout
   */
  async _initiateCheckout({ amount, currency, reference, callbackUrl, clientName }) {
    try {
      const body = {
        amount:   String(amount),
        currency,
        error_url:   callbackUrl ? `${callbackUrl}?status=error&ref=${reference}` : undefined,
        success_url: callbackUrl ? `${callbackUrl}?status=success&ref=${reference}` : undefined,
        client_reference: reference,
        ...(clientName ? { client: { name: clientName } } : {}),
      };

      const response = await fetch(`${this.baseUrl}/checkout/sessions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type':  'application/json',
          'Idempotency-Key': reference,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw { code: 'WAVE_API_ERROR', message: err.message || `Wave API ${response.status}` };
      }

      const data = await response.json();

      logger.info('Wave checkout créé', { sessionId: data.id, amount, reference });

      return {
        providerReference:    data.id,
        checkoutUrl:          data.wave_launch_url,
        status:               'pending',
        mode:                 'api',
        instructions:         `Partagez ce lien au client : ${data.wave_launch_url}`,
        requiresManualConfirmation: false,
      };

    } catch (err) {
      logger.warn('Wave API indisponible, fallback manuel', { error: err.message });
      return this._initiateManual({ amount, currency, merchantPhone: null, reference });
    }
  }

  _initiateManual({ amount, currency, merchantPhone, reference }) {
    const amtFmt = Number(amount).toLocaleString('fr-FR');
    return {
      providerReference: `wave-manual-${reference}`,
      status: 'awaiting_confirmation',
      mode:   'manual',
      instructions: merchantPhone
        ? `Demandez au client d'envoyer ${amtFmt} FCFA sur votre numéro Wave (${merchantPhone}). Confirmez dès réception.`
        : `Client envoie ${amtFmt} FCFA par Wave. Confirmez dès réception.`,
      requiresManualConfirmation: true,
    };
  }

  /**
   * Vérifier statut d'une session checkout
   */
  async checkStatus(providerReference) {
    if (!this.hasApi || providerReference.startsWith('wave-manual-')) {
      return { status: 'awaiting_confirmation', providerStatus: 'manual' };
    }
    try {
      const response = await fetch(`${this.baseUrl}/checkout/sessions/${providerReference}`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      });
      const data = await response.json();
      const statusMap = { complete: 'completed', error: 'failed', pending: 'pending' };
      return {
        status:          statusMap[data.payment_status] || 'pending',
        providerStatus:  data.payment_status,
        providerResponse: data,
      };
    } catch (err) {
      logger.error('Wave checkStatus error', { error: err.message });
      return { status: 'awaiting_confirmation', providerStatus: 'unknown' };
    }
  }

  /**
   * Gérer le webhook Wave
   * Signature HMAC-SHA256 sur le body
   */
  async handleWebhook(payload, signature) {
    // Vérifier la signature si secret configuré
    if (this.webhookSecret && signature) {
      const hmac = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex');
      if (hmac !== signature) {
        throw { code: 'SIGNATURE_INVALIDE', message: 'Signature webhook Wave invalide' };
      }
    }

    logger.info('Wave webhook reçu', { type: payload.type, sessionId: payload.data?.id });

    const session = payload.data || payload;
    const statusMap = { complete: 'completed', error: 'failed' };

    return {
      status:            statusMap[session.payment_status] || 'pending',
      providerReference: session.id,
      clientReference:   session.client_reference,
      amount:            session.amount,
      providerResponse:  payload,
    };
  }

  isAvailable() { return true; }
}

module.exports = WaveAdapter;
