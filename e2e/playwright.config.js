// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  globalSetup: require.resolve('./global-setup.js'),
  testDir: './tests',
  timeout: 30000,
  retries: 1,
  reporter: [['list'], ['json', { outputFile: 'results.json' }]],
  use: {
    baseURL: 'https://app.faymafrica.fr',
    headless: true,
    screenshot: 'on',
    video: 'retain-on-failure',
    // Intercepter window.confirm automatiquement
    bypassCSP: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
