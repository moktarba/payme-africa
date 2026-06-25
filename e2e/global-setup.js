/**
 * global-setup.js — Authentification unique pour toute la suite E2E
 * Exécuté UNE SEULE FOIS avant tous les tests par Playwright.
 * Évite le rate limiter en ne faisant qu'un seul appel send-otp.
 */
const fs = require('fs');
const path = require('path');

const API = 'https://api.faymafrica.fr';
const TEST_PHONE = '+221770000001';
// Le fichier est écrit dans le même dossier que global-setup.js
const AUTH_STATE_PATH = path.join(__dirname, 'auth-state.json');

module.exports = async function globalSetup() {
  process.stderr.write('[global-setup] Authentification unique — send-otp...\n');

  const r1 = await fetch(`${API}/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: TEST_PHONE }),
  }).then(r => r.json());

  if (!r1.devCode) {
    throw new Error('[global-setup] send-otp échoué: ' + JSON.stringify(r1));
  }
  process.stderr.write(`[global-setup] devCode obtenu: ${r1.devCode}\n`);

  const r2 = await fetch(`${API}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: TEST_PHONE, code: r1.devCode }),
  }).then(r => r.json());

  if (!r2.accessToken) {
    throw new Error('[global-setup] verify-otp échoué: ' + JSON.stringify(r2));
  }
  process.stderr.write(`[global-setup] Token obtenu pour: ${r2.merchant?.businessName}\n`);

  const authState = {
    accessToken: r2.accessToken,
    refreshToken: r2.refreshToken,
    merchant: r2.merchant,
  };

  fs.writeFileSync(AUTH_STATE_PATH, JSON.stringify(authState));
  process.stderr.write(`[global-setup] auth-state.json écrit: ${AUTH_STATE_PATH}\n`);
};
