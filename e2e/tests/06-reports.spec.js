/**
 * 06 - ReportsScreen (Rapports & Export CSV)
 */
const { test, expect } = require('@playwright/test');
const { injectAuth, TEST_PHONES, API } = require('./helpers');

test.describe('RAPPORTS — Analytics & Export', () => {
  let accessToken;

  test.beforeEach(async ({ page }) => {
    page.on('dialog', d => d.accept());
    const auth = await injectAuth(page, TEST_PHONES.existing);
    accessToken = auth.accessToken;
  });

  test('ReportsScreen accessible depuis raccourcis Home', async ({ page }) => {
    await page.locator('text="Rapports"').first().click();
    await page.waitForTimeout(2000);
    const body = await page.evaluate(() => document.body.innerText);
    expect(body).toMatch(/Rapport|rapport|CA|Aujourd'hui|semaine/i);
  });

  test('GET /reports/day retourne données', async ({ page }) => {
    const resp = await page.evaluate(async ({ token, api }) => {
      return fetch(`${api}/reports/day`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json());
    }, { token: accessToken, api: API });
    expect(resp.success).toBe(true);
  });

  test('GET /reports/week retourne données', async ({ page }) => {
    const resp = await page.evaluate(async ({ token, api }) => {
      return fetch(`${api}/reports/week`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json());
    }, { token: accessToken, api: API });
    expect(resp.success).toBe(true);
  });

  test('GET /reports/month retourne données', async ({ page }) => {
    const resp = await page.evaluate(async ({ token, api }) => {
      return fetch(`${api}/reports/month`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json());
    }, { token: accessToken, api: API });
    expect(resp.success).toBe(true);
  });

  test('GET /reports/top-items retourne top articles', async ({ page }) => {
    const resp = await page.evaluate(async ({ token, api }) => {
      return fetch(`${api}/reports/top-items`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json());
    }, { token: accessToken, api: API });
    expect(resp.success).toBe(true);
    expect(Array.isArray(resp.items)).toBe(true);
  });

  test('GET /reports/export retourne CSV valide', async ({ page }) => {
    const resp = await page.evaluate(async ({ token, api }) => {
      const r = await fetch(`${api}/reports/export?period=month`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const text = await r.text();
      return { status: r.status, contentType: r.headers.get('content-type'), preview: text.slice(0, 200) };
    }, { token: accessToken, api: API });
    expect(resp.status).toBe(200);
    // CSV doit commencer par une ligne d'en-tête
    expect(resp.preview).toMatch(/date|montant|amount|id/i);
  });

  test('bouton Export visible sur ReportsScreen', async ({ page }) => {
    await page.locator('text="Rapports"').first().click();
    await page.waitForTimeout(2000);
    const body = await page.evaluate(() => document.body.innerText);
    expect(body).toMatch(/Export|export|📤/i);
  });
});
