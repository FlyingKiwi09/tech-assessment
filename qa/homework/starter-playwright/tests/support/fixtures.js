const base = require('@playwright/test');

/**
 * `app` fixture — a thin wrapper that keeps your build seed on every URL and
 * gives you read access to the app's own state.
 *
 *   const { test, expect } = require('../support/fixtures');
 *
 *   test('books a session', async ({ app, page }) => {
 *     await app.goto('/booking.html', { coach: 'c3' });
 *     await expect(page.getByTestId('slot').first()).toBeVisible();
 *   });
 */
exports.test = base.test.extend({
  // Declared as an option so it can be set in playwright.config.js (`use.seed`)
  // and overridden per-project. `make test SEED=…` sets it via the environment.
  seed: ['1000', { option: true }],

  app: async ({ page, seed }, use) => {
    await use({
      page,
      seed,

      /** Visits an app page with the build seed applied. */
      goto: (path, query = {}) =>
        page.goto(`${path}?${new URLSearchParams({ ...query, seed })}`),

      /** The sessions the app currently holds, straight from its store. */
      sessions: () => page.evaluate(() => window.AceUpStore.sessions()),

      /** Reads a build flag. Only meaningful after a page has loaded. */
      flag: (name) => page.evaluate((n) => window.Fx(n), name),

      /** Wipes the app's localStorage keys. Needs a reload to take effect. */
      reset: () =>
        page.evaluate(() => {
          Object.keys(localStorage)
            .filter((k) => k.startsWith('aceup.'))
            .forEach((k) => localStorage.removeItem(k));
        })
    });
  }
});

exports.expect = base.expect;
