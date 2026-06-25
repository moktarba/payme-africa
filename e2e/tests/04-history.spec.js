/**
 * 04 - HistoryScreen (Historique des transactions)
 */
const { test, expect } = require('@playwright/test');
const { injectAuth, TEST_PHONES, API } = require('./helpers');

test.describe('HISTORIQUE — Transactions', () => {
  let accessToken;

  test.beforeEach(async ({ page }) => {
    page.on('dialog', d => d.accept());
    const auth = await injectAuth(page, TEST_PHONES.existing);
    accessToken = auth.accessToken;
    // Naviguer vers Historique
    await page.locator('text="Historique"').first().click();
    await page.waitForTimeout(2000);
  });

  test('HistoryScreen se charge', async ({ page }) => {
    const body = await page.evaluate(() => document.body.innerText);
    expect(body).toMatch(/Historique|transaction|F CFA/i);
  });

  test('filtres Statut et Mode de paiement visibles', async ({ page }) => {
    const body = await page.evaluate(() => document.body.innerText);
    expect(body).toMatch(/Statut|Mode|Filtre/i);
  });

  test('GET /transactions retourne liste paginée', async ({ page }) => {
    const resp = await page.evaluate(async ({ token, api }) => {
      return fetch(`${api}/transactions?page=1&limit=10`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json());
    }, { token: accessToken, api: API });

    expect(resp.success).toBe(true);
    expect(Array.isArray(resp.transactions)).toBe(true);
  });

  test('GET /transactions/stats/day retourne stats', async ({ page }) => {
    const resp = await page.evaluate(async ({ token, api }) => {
      return fetch(`${api}/transactions/stats/day`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json());
    }, { token: accessToken, api: API });

    expect(resp.success).toBe(true);
    expect(resp.stats).toBeTruthy();
  });

  test('recherche visible', async ({ page }) => {
    // Le placeholder TextInput RN Web n'est pas dans body.innerText — vérifier l'attribut placeholder
    const searchInput = page.locator('input[placeholder*="Rechercher"], input[placeholder*="recherch"], input[placeholder*="Search"]');
    const count = await searchInput.count();
    expect(count).toBeGreaterThan(0);
  });
});
