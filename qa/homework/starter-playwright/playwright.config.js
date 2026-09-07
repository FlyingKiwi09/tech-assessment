const { defineConfig } = require('@playwright/test');

// In Docker the app container serves the app and BASE_URL is set for us.
// Natively we serve ../../app ourselves — see `webServer` below.
const baseURL = process.env.BASE_URL || 'http://localhost:4173';

module.exports = defineConfig({
  testDir: './tests',

  // Retries are OFF on purpose: we want to see whether the suite is
  // deterministic, not whether retries can hide flakiness.
  retries: 0,

  // Single worker, no intra-file parallelism: this keeps a run reproducible and
  // comparable to the Cypress path. You may raise them — explain why in your
  // TEST_PLAN.md, and note that any flakiness you introduce is yours to own.
  workers: 1,
  fullyParallel: false,

  // A stray `.only` fails the run instead of silently hiding the rest of your suite.
  forbidOnly: true,

  // `list` only. The default HTML reporter tries to serve a report when the run
  // ends, which hangs the Docker container.
  reporter: [['list']],

  timeout: 30000,
  expect: { timeout: 6000 },

  use: {
    baseURL,
    // Your build seed. Override with: SEED=1234 npx playwright test
    seed: process.env.SEED || '1000',
    // The app marks elements with data-testid, so page.getByTestId() works.
    testIdAttribute: 'data-testid',
    actionTimeout: 6000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off'
  },

  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],

  // Native runs only. In Docker, BASE_URL is set, so this is skipped.
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'npx --yes serve --no-clipboard -l 4173 ../../app',
        url: 'http://localhost:4173/index.html',
        reuseExistingServer: true,
        timeout: 60000
      }
});
