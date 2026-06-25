/**
 * 03 - EncaissementScreen (Créer une transaction)
 */
const { test, expect } = require('@playwright/test');
const { injectAuth, TEST_PHONES, API } = require('./helpers');

test.describe('ENCAISSEMENT — Créer transaction', () => {
  let accessToken;

  test.beforeEach(async ({ page }) => {
    page.on('dialog', d => d.accept());
    const auth = await injectAuth(page, TEST_PHONES.existing);
    accessToken = auth.accessToken;
  });

  test('EncaissementScreen charge le clavier numérique', async ({ page }) => {
    await page.locator('text="Encaisser"').first().click();
    await page.waitForTimeout(2000);
    const body = await page.evaluate(() => document.body.innerText);
    // Le clavier numérique doit avoir des chiffres
    expect(body).toMatch(/[0-9]/);
    expect(body).toMatch(/F CFA|montant|Encaisser/i);
  });

  test('montants rapides visibles sur EncaissementScreen', async ({ page }) => {
    await page.locator('text="Encaisser"').first().click();
    await page.waitForTimeout(2000);
    const body = await page.evaluate(() => document.body.innerText);
    // Montants rapides (500, 1000, 2000, 5000...)
    expect(body).toMatch(/500|1\s?000|2\s?000|5\s?000/);
  });

  test('création transaction Cash via API', async ({ page }) => {
    const resp = await page.evaluate(async ({ token, api }) => {
      const r = await fetch(`${api}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          amount: 1500,
          paymentProvider: 'cash',
          customerName: 'Robot Playwright',
          note: 'Test E2E automatisé'
        })
      }).then(r => r.json());
      return r;
    }, { token: accessToken, api: API });

    expect(resp.success).toBe(true);
    expect(resp.transaction).toBeTruthy();
    expect(resp.transaction.amount).toBe(1500);
    expect(resp.transaction.paymentProvider).toBe('cash');
  });

  test('création transaction Wave via API', async ({ page }) => {
    const resp = await page.evaluate(async ({ token, api }) => {
      const r = await fetch(`${api}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          amount: 3000,
          paymentProvider: 'wave',
          customerName: 'Client Wave Test',
        })
      }).then(r => r.json());
      return r;
    }, { token: accessToken, api: API });

    expect(resp.success).toBe(true);
    expect(resp.transaction.paymentProvider).toBe('wave');
  });

  test('transaction apparaît dans la liste après création', async ({ page }) => {
    // Créer une transaction
    const createResp = await page.evaluate(async ({ token, api }) => {
      return fetch(`${api}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ amount: 750, paymentProvider: 'cash', customerName: 'Test Playwright' })
      }).then(r => r.json());
    }, { token: accessToken, api: API });

    const txId = createResp.transaction.id;

    // Vérifier qu'elle existe
    const getResp = await page.evaluate(async ({ token, api, id }) => {
      return fetch(`${api}/transactions/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json());
    }, { token: accessToken, api: API, id: txId });

    expect(getResp.success).toBe(true);
    expect(getResp.transaction.amount).toBe(750);
  });

  test('onglet Catalogue sur EncaissementScreen', async ({ page }) => {
    await page.locator('text="Encaisser"').first().click();
    await page.waitForTimeout(2000);
    const body = await page.evaluate(() => document.body.innerText);
    expect(body).toMatch(/Catalogue|article/i);
  });
});
