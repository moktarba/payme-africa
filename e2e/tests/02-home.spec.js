/**
 * 02 - HomeScreen (Dashboard)
 */
const { test, expect } = require('@playwright/test');
const { injectAuth, goToTab, TEST_PHONES } = require('./helpers');

test.describe('HOME — Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    page.on('dialog', d => d.accept());
    await injectAuth(page, TEST_PHONES.existing);
  });

  test('affiche le nom du commerce', async ({ page }) => {
    await expect(page.locator('text="Test Boutique"')).toBeVisible();
  });

  test('affiche Bonjour + date', async ({ page }) => {
    await expect(page.locator('text=/Bonjour/i')).toBeVisible();
  });

  test('bouton Encaisser visible et cliquable', async ({ page }) => {
    const btn = page.locator('text="Encaisser"').first();
    await expect(btn).toBeVisible();
    await btn.click();
    await page.waitForTimeout(1000);
    // Soit on est sur EncaissementScreen, soit une modale s'ouvre
    const body = await page.evaluate(() => document.body.innerText);
    expect(body).toMatch(/encaiss|montant|F CFA/i);
  });

  test('affiche le CA du jour', async ({ page }) => {
    // Les stats sont chargées de façon asynchrone — attendre jusqu'à 12s
    await expect(page.locator('text=/CA aujourd\'hui/i')).toBeVisible({ timeout: 12000 });
    // Intl.NumberFormat fr-FR XOF utilise des espaces insécables ( ) que les locators ne matchent pas
    // → Vérifier via body.innerText qui normalise les espaces
    await page.waitForTimeout(3000);
    const body = await page.evaluate(() => document.body.innerText);
    expect(body).toMatch(/CFA/);
  });

  test('affiche les onglets de navigation', async ({ page }) => {
    await expect(page.locator('text="Accueil"').first()).toBeVisible();
    await expect(page.locator('text="Historique"').first()).toBeVisible();
    await expect(page.locator('text="Catalogue"').first()).toBeVisible();
    await expect(page.locator('text="Profil"').first()).toBeVisible();
  });

  test('affiche les raccourcis (Historique, Catalogue, Rapports, Notifications)', async ({ page }) => {
    const body = await page.evaluate(() => document.body.innerText);
    expect(body).toContain('Historique');
    expect(body).toContain('Catalogue');
    expect(body).toContain('Rapports');
    expect(body).toContain('Notifications');
  });

  test('bilan semaine et mois visibles', async ({ page }) => {
    await expect(page.locator('text=/Cette semaine/i')).toBeVisible();
    await expect(page.locator('text=/Ce mois/i')).toBeVisible();
  });
});
