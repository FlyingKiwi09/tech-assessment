// Example spec — it passes as-is. Use it to check your setup, then delete or
// replace it with your own suite.

const { test, expect } = require('../support/fixtures');

test.describe('smoke', () => {
  test('loads the dashboard', async ({ app, page }) => {
    await app.goto('/index.html');
    await expect(page.locator('h1')).toContainText('Good morning');
    await expect(page.getByTestId('stat-upcoming')).toBeAttached();
  });

  test('lists coaches', async ({ app, page }) => {
    await app.goto('/coaches.html');
    await expect(page.getByTestId('coach-card').first()).toBeVisible();
    expect(await page.getByTestId('coach-card').count()).toBeGreaterThan(0);
  });
});
