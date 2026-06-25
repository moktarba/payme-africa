/**
 * 05 - CatalogScreen (Catalogue articles)
 */
const { test, expect } = require('@playwright/test');
const { injectAuth, TEST_PHONES, API } = require('./helpers');

test.describe('CATALOGUE — Articles', () => {
  let accessToken;

  test.beforeEach(async ({ page }) => {
    page.on('dialog', d => d.accept());
    const auth = await injectAuth(page, TEST_PHONES.existing);
    accessToken = auth.accessToken;
    await page.locator('text="Catalogue"').first().click();
    await page.waitForTimeout(2000);
  });

  test('CatalogScreen se charge', async ({ page }) => {
    const body = await page.evaluate(() => document.body.innerText);
    expect(body).toMatch(/Catalogue|article|produit/i);
  });

  test('bouton Ajouter visible', async ({ page }) => {
    const body = await page.evaluate(() => document.body.innerText);
    expect(body).toMatch(/Ajouter|nouveau|créer/i);
  });

  test('CRUD catalogue via API : créer, lire, supprimer', async ({ page }) => {
    const ts = Date.now();

    // Créer
    const createResp = await page.evaluate(async ({ token, api, ts }) => {
      return fetch(`${api}/catalog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: `Article E2E ${ts}`, price: 500, category: 'Test' })
      }).then(r => r.json());
    }, { token: accessToken, api: API, ts });

    expect(createResp.success).toBe(true);
    const itemId = createResp.item.id;

    // Lire
    const listResp = await page.evaluate(async ({ token, api }) => {
      return fetch(`${api}/catalog`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json());
    }, { token: accessToken, api: API });

    expect(listResp.success).toBe(true);
    expect(listResp.items.some(i => i.id === itemId)).toBe(true);

    // Mettre à jour
    const updateResp = await page.evaluate(async ({ token, api, id, ts }) => {
      return fetch(`${api}/catalog/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: `Article E2E modifié ${ts}`, price: 750 })
      }).then(r => r.json());
    }, { token: accessToken, api: API, id: itemId, ts });

    expect(updateResp.success).toBe(true);

    // Supprimer
    const deleteResp = await page.evaluate(async ({ token, api, id }) => {
      return fetch(`${api}/catalog/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json());
    }, { token: accessToken, api: API, id: itemId });

    expect(deleteResp.success).toBe(true);
  });
});
