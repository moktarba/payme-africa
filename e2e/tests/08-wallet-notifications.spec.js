/**
 * 08 - Wallet, Notifications, Employees, Health
 */
const { test, expect } = require('@playwright/test');
const { injectAuth, TEST_PHONES, API } = require('./helpers');

test.describe('WALLET & NOTIFICATIONS', () => {
  let accessToken;

  test.beforeEach(async ({ page }) => {
    page.on('dialog', d => d.accept());
    const auth = await injectAuth(page, TEST_PHONES.existing);
    accessToken = auth.accessToken;
  });

  test('GET /wallet retourne balance_today/week/month', async ({ page }) => {
    const resp = await page.evaluate(async ({ token, api }) => {
      return fetch(`${api}/wallet`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json());
    }, { token: accessToken, api: API });

    expect(resp.success).toBe(true);
    expect(resp.wallet).toBeTruthy();
    expect(typeof resp.wallet.balance_today).toBe('number');
    expect(typeof resp.wallet.balance_week).toBe('number');
    expect(typeof resp.wallet.balance_month).toBe('number');
    expect(resp.wallet.currency).toBe('XOF');
  });

  test('GET /notifications retourne liste', async ({ page }) => {
    const resp = await page.evaluate(async ({ token, api }) => {
      return fetch(`${api}/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json());
    }, { token: accessToken, api: API });
    expect(resp.success).toBe(true);
    expect(Array.isArray(resp.notifications)).toBe(true);
  });

  test('GET /notifications/preferences retourne préférences', async ({ page }) => {
    const resp = await page.evaluate(async ({ token, api }) => {
      return fetch(`${api}/notifications/preferences`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json());
    }, { token: accessToken, api: API });
    expect(resp.success).toBe(true);
  });

  test('GET /employees retourne liste', async ({ page }) => {
    const resp = await page.evaluate(async ({ token, api }) => {
      return fetch(`${api}/employees`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json());
    }, { token: accessToken, api: API });
    expect(resp.success).toBe(true);
    expect(Array.isArray(resp.employees)).toBe(true);
  });

  test('GET /health retourne ok + redis connected', async ({ page }) => {
    const resp = await page.evaluate(async ({ api }) => {
      return fetch(`${api}/health`).then(r => r.json());
    }, { api: API });
    expect(resp.success).toBe(true);
    expect(resp.status).toBe('ok');
    expect(resp.redis).toBe('connected');
    expect(resp.db).toBe(true);
  });
});

test.describe('PIN LOGIN', () => {
  test.beforeEach(async ({ page }) => {
    page.on('dialog', d => d.accept());
    await injectAuth(page, TEST_PHONES.existing);
  });

  test('PinLoginScreen accessible depuis Profil', async ({ page }) => {
    await page.locator('text="Profil"').first().click();
    await page.waitForTimeout(1500);
    await page.locator('text=/PIN|employé/i').first().click();
    await page.waitForTimeout(2000);
    const body = await page.evaluate(() => document.body.innerText);
    expect(body).toMatch(/PIN|employé|connexion rapide/i);
  });
});
