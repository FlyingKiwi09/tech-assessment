// INTERNAL verification harness (not for candidates) — Playwright port of
// verify.internal.cy.js. It asserts that every planted defect still reproduces.
// Tier B assertions are skipped automatically when the flag is not active for
// the current seed.
//
// Run it through Docker (see reference/README.md):
//   cp homework-evaluation/reference/verify.internal.spec.js homework/starter-playwright/tests/e2e/
//   make test FRAMEWORK=playwright SEED=1000
//   make test FRAMEWORK=playwright SEED=1234

const { test, expect } = require('../support/fixtures');

const SEED = process.env.SEED || '1000';

function fmtHour(h) {
  const suffix = h >= 12 ? 'PM' : 'AM';
  const x = h % 12 === 0 ? 12 : h % 12;
  return `${x}:00 ${suffix}`;
}

async function openBooking(app, page, coach = 'c1') {
  await app.goto('/booking.html', { coach });
  await expect(page.getByTestId('slot').first()).toBeAttached();
}

function firstAvailableSlot(page) {
  return page.locator('[data-testid="slot"][data-available="true"]').first();
}

async function bookOnce(app, page, { coach = 'c1', duration, notes, guest } = {}) {
  await openBooking(app, page, coach);
  await firstAvailableSlot(page).click();
  await page.getByTestId('continue').click();
  if (duration) await page.getByTestId('duration').selectOption(String(duration));
  if (notes) {
    await page.getByTestId('notes').fill(notes);
    await page.getByTestId('notes').dispatchEvent('input');
  }
  if (guest) await page.getByTestId('guest-email').fill(guest);
  await page.getByTestId('confirm-booking').click();
}

const modalClosed = (page) =>
  expect(page.locator('#confirm-modal')).not.toHaveClass(/\bopen\b/);

test.describe(`planted defects (seed ${SEED})`, () => {
  test('A1 — stored time drifts by the coach offset (c2 = UTC-5)', async ({ app, page }) => {
    await openBooking(app, page, 'c2');
    const slot = firstAvailableSlot(page);
    const hour = Number(await slot.getAttribute('data-hour'));
    await slot.click();
    await page.getByTestId('continue').click();
    await expect(page.getByTestId('sum-time')).toHaveText(fmtHour(hour));
    await page.getByTestId('confirm-booking').click();
    await modalClosed(page);

    await app.goto('/sessions.html');
    await expect(page.getByTestId('session-when')).toContainText(fmtHour(hour - 5));
  });

  test('A2 — double click on Confirm creates two sessions', async ({ app, page }) => {
    await openBooking(app, page);
    await firstAvailableSlot(page).click();
    await page.getByTestId('continue').click();
    const confirm = page.getByTestId('confirm-booking');
    await confirm.click();
    await confirm.click();
    // both requests are in flight; navigating now would abort them, so wait on state
    await expect
      .poll(() => app.sessions().then((s) => s.length))
      .toBe(2);

    await app.goto('/sessions.html');
    await expect(page.getByTestId('session-row')).toHaveCount(2);
  });

  test('A3 — cancelling does not free the slot', async ({ app, page }) => {
    await openBooking(app, page);
    const slot = firstAvailableSlot(page);
    const hour = Number(await slot.getAttribute('data-hour'));
    await slot.click();
    await page.getByTestId('continue').click();
    await page.getByTestId('confirm-booking').click();
    await modalClosed(page);

    await app.goto('/sessions.html');
    await page.getByRole('button', { name: 'Cancel' }).first().click();
    await expect(page.getByTestId('session-status')).toHaveText('cancelled');

    await openBooking(app, page);
    await expect(page.locator(`[data-testid="slot"][data-hour="${hour}"]`)).toHaveAttribute(
      'data-available',
      'false'
    );
  });

  test('A4 — whitespace-only chat message is accepted', async ({ app, page }) => {
    await app.goto('/chat.html');
    await page.getByTestId('chat-input').fill('   ');
    await page.getByTestId('chat-send').click();
    await expect(page.getByTestId('bubble-user')).toHaveCount(1);
    await expect(page.getByTestId('bubble-ally')).toHaveCount(2);
  });

  test('A5 — notes are silently truncated at 280 characters', async ({ app, page }) => {
    await bookOnce(app, page, { notes: 'x'.repeat(400) });
    await modalClosed(page);
    await app.goto('/sessions.html');
    const note = await page.locator('[data-testid="session-row"] .hint').innerText();
    expect(note).toHaveLength(280);
  });

  test('B1 — filter is dropped on page 2', async ({ app, page }) => {
    await app.goto('/coaches.html');
    test.skip(!(await app.flag('fx_b1')), `fx_b1 inactive for seed ${SEED}`);

    await page.getByTestId('filter-specialty').selectOption('Leadership');
    await expect(page.getByTestId('result-count')).toHaveText('3 coaches found');
    await expect(page.getByTestId('page-label')).toHaveText('Page 1 of 3');
    await page.locator('#next').click();
    await expect(page.getByTestId('coach-card')).toHaveCount(4);
    const tags = await page.locator('[data-testid="coach-card"] .tag').allInnerTexts();
    expect(tags.every((t) => t.includes('Leadership'))).toBe(false);
  });

  test('B2 — reschedule resets duration to 30', async ({ app, page }) => {
    await app.goto('/coaches.html');
    test.skip(!(await app.flag('fx_b2')), `fx_b2 inactive for seed ${SEED}`);

    await bookOnce(app, page, { duration: 60 });
    await modalClosed(page);
    await app.goto('/sessions.html');
    await expect(page.getByTestId('session-duration')).toHaveText('60');
    await page.getByRole('button', { name: 'Reschedule' }).first().click();
    await expect(page.locator('[data-testid="resched-hour"] option').first()).toBeAttached();
    await page.getByTestId('resched-save').click();
    await expect(page.getByTestId('session-duration')).toHaveText('30');
  });

  test('B3 — success toast on a failed booking', async ({ app, page }) => {
    await app.goto('/coaches.html');
    test.skip(!(await app.flag('fx_b3')), `fx_b3 inactive for seed ${SEED}`);

    for (let i = 0; i < 3; i += 1) {
      await bookOnce(app, page);
      await modalClosed(page);
    }
    // 4th attempt fails server-side but still reports success
    await bookOnce(app, page);
    await expect(page.locator('#toast')).toContainText('Session booked');
    await app.goto('/sessions.html');
    await expect(page.getByTestId('session-row')).toHaveCount(3);
  });

  test('B4 — chat hangs after a failed reply', async ({ app, page }) => {
    await app.goto('/chat.html');
    test.skip(!(await app.flag('fx_b4')), `fx_b4 inactive for seed ${SEED}`);

    const input = page.getByTestId('chat-input');
    await input.fill('hello');
    await input.press('Enter');
    await expect(page.getByTestId('bubble-ally')).toHaveCount(2);
    await input.fill('and my goals?');
    await input.press('Enter');
    await expect(page.getByTestId('bubble-ally')).toHaveCount(3);
    await input.fill('third one');
    await input.press('Enter');
    await expect(page.getByTestId('typing')).toHaveClass(/\bshow\b/, { timeout: 8000 });
    await page.waitForTimeout(2500); // harness only: prove the state never recovers
    await expect(page.getByTestId('typing')).toHaveClass(/\bshow\b/);
    await expect(input).toBeDisabled();
  });

  test('B5 — invalid guest email is accepted', async ({ app, page }) => {
    await app.goto('/coaches.html');
    test.skip(!(await app.flag('fx_b5')), `fx_b5 inactive for seed ${SEED}`);

    await bookOnce(app, page, { guest: 'alex@company' });
    await modalClosed(page);
    await app.goto('/sessions.html');
    await expect(page.getByTestId('session-row')).toHaveCount(1);
  });

  test('B6 — dashboard count is stale after cancelling', async ({ app, page }) => {
    await app.goto('/coaches.html');
    test.skip(!(await app.flag('fx_b6')), `fx_b6 inactive for seed ${SEED}`);

    await bookOnce(app, page, { coach: 'c1' });
    await modalClosed(page);
    await bookOnce(app, page, { coach: 'c3' });
    await modalClosed(page);

    await app.goto('/index.html');
    await expect(page.getByTestId('stat-upcoming')).toHaveText('2');

    await app.goto('/sessions.html');
    await page.getByRole('button', { name: 'Cancel' }).first().click();
    await expect(page.getByTestId('session-status').first()).toContainText('cancelled');

    await app.goto('/index.html');
    await expect(page.getByTestId('stat-upcoming')).toHaveText('2');
  });
});
