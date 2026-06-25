/**
 * Helpers partagés pour les tests PayMe Africa E2E
 * Cible : https://app.faymafrica.fr (DEMO_OTP=true)
 */

const API = 'https://api.faymafrica.fr';

// Comptes de test disponibles (ne pas rate-limiter le même)
const TEST_PHONES = {
  existing: '+221770000001',   // Test Boutique — compte existant
  existing2: '+221770000099',  // Test Boutique 99
};

/**
 * Envoie un OTP et retourne le devCode DEMO
 */
async function sendOtp(phone) {
  const resp = await fetch(`${API}/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  const data = await resp.json();
  return data.devCode;
}

/**
 * Remplit le champ téléphone sur PhoneScreen
 */
async function fillPhone(page, phone) {
  // Strip +221 prefix — l'app ajoute +221 automatiquement
  const local = phone.replace('+221', '');
  const input = page.locator('input[type="tel"]').last();
  await input.click();
  await input.fill(local);
}

/**
 * Clique sur un élément contenant exactement ce texte (RN Web)
 */
async function clickText(page, text) {
  await page.locator(`text="${text}"`).first().click();
}

/**
 * Attend que le titre de page change
 */
async function waitForScreen(page, screenName, timeout = 10000) {
  await page.waitForFunction(
    (name) => document.title === name,
    screenName,
    { timeout }
  );
}

/**
 * Login complet via l'UI (PhoneScreen → OTPScreen → HomeScreen)
 * DEMO_OTP=true : le code est pré-rempli par le backend dans les inputs OTP.
 * Ne fait PAS d'appel send-otp séparé (l'app s'en charge quand on clique Continuer).
 */
async function loginUI(page, phone) {
  page.on('dialog', dialog => dialog.accept());

  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitForScreen(page, 'Phone', 10000);

  await fillPhone(page, phone);
  await clickText(page, 'Continuer');
  // L'app appelle send-otp et pré-remplit le code DEMO dans les inputs
  await waitForScreen(page, 'OTP', 15000);

  await page.waitForTimeout(1500); // laisser le pré-remplissage s'effectuer
  await clickText(page, 'Vérifier');
  await waitForScreen(page, 'home', 15000);
}

/**
 * Injecte un JWT depuis auth-state.json (créé par global-setup.js — zéro appel send-otp)
 * Le token est obtenu une seule fois pour toute la suite, évitant le rate limiter.
 */
async function injectAuth(page, _phone) {
  // Lire le token depuis le fichier écrit par global-setup.js
  const authData = JSON.parse(
    require('fs').readFileSync(
      require('path').join(__dirname, '..', 'auth-state.json'),
      'utf-8'
    )
  );

  await page.goto('/');
  await page.evaluate((auth) => {
    localStorage.setItem('accessToken', auth.accessToken);
    localStorage.setItem('refreshToken', auth.refreshToken);
    localStorage.setItem('merchant', JSON.stringify(auth.merchant));
  }, authData);

  await page.reload();
  await waitForScreen(page, 'home', 10000);
  return authData;
}

/**
 * Navigue vers un onglet du tab navigator
 */
async function goToTab(page, tabName) {
  await page.locator(`text="${tabName}"`).first().click();
  await page.waitForTimeout(1500);
}

module.exports = { loginUI, injectAuth, fillPhone, clickText, waitForScreen, goToTab, TEST_PHONES, API };
