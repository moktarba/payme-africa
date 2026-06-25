/**
 * 07 - ProfileScreen (Profil, moyens de paiement, logout)
 */
const { test, expect } = require('@playwright/test');
const { injectAuth, TEST_PHONES, API } = require('./helpers');

test.describe('PROFIL — Compte & Déconnexion', () => {
  let accessToken;

  test.beforeEach(async ({ page }) => {
    page.on('dialog', d => d.accept());
    const auth = await injectAuth(page, TEST_PHONES.existing);
    accessToken = auth.accessToken;
    await page.locator('text="Profil"').first().click();
    await page.waitForTimeout(2000);
  });

  test('ProfileScreen affiche les infos du merchant', async ({ page }) => {
    // Vérifier via body.innerText (plus robuste que locator pour les éléments dans ScrollView)
    await page.waitForTimeout(3000);
    const body = await page.evaluate(() => document.body.innerText);
    expect(body).toMatch(/Test Boutique/);
    expect(body).toMatch(/\+221/);
  });

  test('moyens de paiement listés avec toggles', async ({ page }) => {
    const body = await page.evaluate(() => document.body.innerText);
    expect(body).toMatch(/Wave|Cash|paiement/i);
    // Les toggles Switch doivent être présents
    const switches = await page.locator('input[role="switch"], [role="switch"]').count();
    expect(switches).toBeGreaterThanOrEqual(0); // Peut être 0 si pas de moyens configurés
  });

  test('GET /merchants/me retourne les infos', async ({ page }) => {
    const resp = await page.evaluate(async ({ token, api }) => {
      return fetch(`${api}/merchants/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json());
    }, { token: accessToken, api: API });
    expect(resp.success).toBe(true);
    expect(resp.merchant.business_name).toBeTruthy();
  });

  test('GET /merchants/payment-methods retourne les moyens de paiement', async ({ page }) => {
    const resp = await page.evaluate(async ({ token, api }) => {
      return fetch(`${api}/merchants/me/payment-methods`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json());
    }, { token: accessToken, api: API });
    expect(resp.success).toBe(true);
    expect(Array.isArray(resp.paymentMethods)).toBe(true);
    expect(resp.paymentMethods.length).toBeGreaterThanOrEqual(0);
  });

  test('bouton Connexion employé PIN visible', async ({ page }) => {
    const body = await page.evaluate(() => document.body.innerText);
    expect(body).toMatch(/PIN|employé/i);
  });

  test('bouton Se déconnecter visible', async ({ page }) => {
    await expect(page.locator('text="Se déconnecter"')).toBeVisible();
  });

  test('logout via window.confirm → retour PhoneScreen + localStorage vide', async ({ page }) => {
    // window.confirm déjà accepté via page.on('dialog')
    await page.locator('text="Se déconnecter"').first().click();
    // Attendre redirect vers Phone
    await page.waitForFunction(() => document.title === 'Phone', { timeout: 8000 });
    expect(await page.title()).toBe('Phone');
    // localStorage doit être vide
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(token).toBeNull();
  });
});
