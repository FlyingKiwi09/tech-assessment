const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:4173',
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/**/*.cy.js',
    // Retries are OFF on purpose: we want to see whether the suite is
    // deterministic, not whether retries can hide flakiness.
    retries: 0,
    video: false,
    screenshotOnRunFailure: true,
    viewportWidth: 1280,
    viewportHeight: 800,
    defaultCommandTimeout: 6000
  },
  env: {
    // Override with: SEED=1234 npm run e2e   (or edit this value)
    seed: process.env.SEED || '1000'
  }
});
