const CashAdapter        = require('./CashAdapter');
const WaveAdapter        = require('./WaveAdapter');
const OrangeMoneyAdapter = require('./OrangeMoneyAdapter');
const FreeMoneyAdapter   = require('./FreeMoneyAdapter');
const PayDunyaAdapter    = require('./PayDunyaAdapter');
const { logger }         = require('../../config/database');

const ADAPTERS = {
  cash:         CashAdapter,
  wave:         WaveAdapter,
  orange_money: OrangeMoneyAdapter,
  free_money:   FreeMoneyAdapter,
  paydunya:     PayDunyaAdapter,
};

function getAdapter(provider, config = {}) {
  const Cls = ADAPTERS[provider];
  if (!Cls) throw { code: 'PROVIDER_INCONNU', message: `Provider inconnu: ${provider}` };
  return new Cls(config);
}

function isProviderEnabled(provider) {
  const flags = {
    cash:         true,
    wave:         process.env.FEATURE_WAVE_ENABLED         !== 'false',
    orange_money: process.env.FEATURE_ORANGE_ENABLED       !== 'false',
    free_money:   process.env.FEATURE_FREE_MONEY_ENABLED   !== 'false',
    paydunya:     process.env.FEATURE_PAYDUNYA_ENABLED     === 'true',
  };
  return flags[provider] ?? false;
}

function listAvailableProviders() {
  return Object.keys(ADAPTERS).filter(isProviderEnabled);
}

module.exports = { getAdapter, isProviderEnabled, listAvailableProviders };
