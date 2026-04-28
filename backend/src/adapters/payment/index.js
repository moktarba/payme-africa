const CashAdapter = require('./CashAdapter');
const WaveAdapter = require('./WaveAdapter');
const { logger } = require('../../config/database');

const ADAPTERS = {
  cash: CashAdapter,
  wave: WaveAdapter,
  // orange_money: OrangeMoneyAdapter,  // Sprint 4
  // free_money: FreeMoneyAdapter,       // Sprint 5
};

/**
 * Récupère l'adaptateur pour un provider donné
 * @param {string} provider - 'wave', 'cash', 'orange_money', etc.
 * @param {object} config - config spécifique au marchand
 */
function getAdapter(provider, config = {}) {
  const AdapterClass = ADAPTERS[provider];
  if (!AdapterClass) {
    throw { code: 'PROVIDER_INCONNU', message: `Provider de paiement inconnu: ${provider}` };
  }
  return new AdapterClass(config);
}

/**
 * Vérifie si un provider est activé (feature flag)
 */
function isProviderEnabled(provider) {
  const flags = {
    cash: true,
    wave: process.env.FEATURE_WAVE_ENABLED !== 'false',
    orange_money: process.env.FEATURE_ORANGE_ENABLED === 'true',
    free_money: process.env.FEATURE_FREE_MONEY_ENABLED === 'true',
  };
  return flags[provider] ?? false;
}

/**
 * Liste les providers disponibles
 */
function listAvailableProviders() {
  return Object.keys(ADAPTERS).filter(isProviderEnabled);
}

module.exports = { getAdapter, isProviderEnabled, listAvailableProviders };
