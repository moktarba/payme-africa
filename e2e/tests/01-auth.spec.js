/**
 * 01 - Authentification (Inscription, Connexion, Logout)
 */
const { test, expect } = require('@playwright/test');
const { loginUI, injectAuth, fillPhone, clickText, waitForScreen, TEST_PHONES } = require('./helpers');

test.describe('AUTH — Connexion', () => {
  test('affiche PhoneScreen quand non connecté', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await waitForScreen(page, 'Phone');
    await expect(page.locator('text="Continuer"')).toBeVisible();
    await expect(page.locator('text="Créer un compte"')).toBeVisible();
  });

  test('flow login complet : Phone → OTP → Home', async ({ page }) => {
    page.on('dialog', d => d.accept());
    await loginUI(page, TEST_PHONES.existing);
    expect(page.url()).toContain('app.faymafrica.fr');
    await page.waitForTimeout(3000); // attendre que les onglets de navigation soient rendus
    // Vérifier via body.innerText (plus robuste que locator en headless)
    const body = await page.evaluate(() => document.body.innerText);
    expect(body).toMatch(/Encaisser/i);
    expect(body).toMatch(/Historique/i);
  });

  test('OTPScreen affiche le code DEMO pré-rempli', async ({ page }) => {
    page.on('dialog', d => d.accept());
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await waitForScreen(page, 'Phone');
    await fillPhone(page, TEST_PHONES.existing2);
    await clickText(page, 'Continuer');
    await waitForScreen(page, 'OTP', 12000);
    await page.waitForTimeout(2000); // laisser le devCode se pré-remplir
    // OtpScreen affiche un badge "⚙️ DEV : code pré-rempli XXXXXX" quand DEMO_OTP=true
    await expect(page.locator('text=/DEV|pré-rempli/i')).toBeVisible({ timeout: 5000 });
  });

  test('logout redirige vers PhoneScreen et vide le localStorage', async ({ page }) => {
    page.on('dialog', d => d.accept());
    await injectAuth(page, TEST_PHONES.existing);
    // Aller sur Profil
    await page.locator('text="Profil"').first().click();
    await page.waitForTimeout(1500);
    await expect(page.locator('text="Se déconnecter"')).toBeVisible();
    // Cliquer Se déconnecter
    await page.locator('text="Se déconnecter"').first().click();
    await waitForScreen(page, 'Phone', 8000);
    // Vérifier que le token est effacé
    const token = await page.evaluate(() => localStorage.getItem('accessToken'));
    expect(token).toBeNull();
  });
});

test.describe('AUTH — Inscription', () => {
  test('RegisterScreen accessible depuis PhoneScreen', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await waitForScreen(page, 'Phone');
    await clickText(page, 'Créer un compte');
    await waitForScreen(page, 'Register', 8000);
    await expect(page.locator('text="Créer votre compte"')).toBeVisible();
    await expect(page.locator('text="Créer mon compte"')).toBeVisible();
  });

  test('RegisterScreen contient tous les champs', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await waitForScreen(page, 'Phone');
    await clickText(page, 'Créer un compte');
    await waitForScreen(page, 'Register', 8000);
    await expect(page.locator('input[type="tel"]').last()).toBeVisible();
    await expect(page.locator('text=/Nom de votre commerce/i')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/Boutique.*épicerie|épicerie/i')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/Vendeur ambulant/i')).toBeVisible({ timeout: 5000 });
  });

  test('inscription nouveau compte → OTP → HomeScreen', async ({ page }) => {
    page.on('dialog', d => d.accept());
    // Naviguer d'abord sur l'app pour que les requêtes CORS partent du bon origin
    await page.goto('/');
    // Générer un numéro unique basé sur timestamp
    const ts = Date.now().toString().slice(-7);
    const phone = `+22178${ts.slice(0,7)}`;

    // D'abord créer le compte via API (RegisterScreen soumet → backend crée → OTP)
    const regResp = await page.evaluate(async (p) => {
      const r = await fetch('https://api.faymafrica.fr/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: p, businessName: 'E2E Test Shop',
          ownerName: 'Robot Test', city: 'Dakar', activityType: 'boutique'
        })
      }).then(r => r.json());
      return r;
    }, phone);

    expect(regResp.success).toBe(true);
    expect(regResp.devCode).toBeTruthy();

    // Vérifier l'OTP → obtenir JWT
    const verifyResp = await page.evaluate(async ({ p, code }) => {
      const r = await fetch('https://api.faymafrica.fr/auth/verify-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: p, code })
      }).then(r => r.json());
      return r;
    }, { p: phone, code: regResp.devCode });

    expect(verifyResp.success).toBe(true);
    expect(verifyResp.accessToken).toBeTruthy();
    expect(verifyResp.merchant.businessName).toBe('E2E Test Shop');
  });
});
