// Example spec — it passes as-is. Use it to check your setup, then delete or
// replace it with your own suite.

const { test, expect } = require("../support/fixtures");

test.describe("smoke", () => {
  test("loads the dashboard", async ({ app, page }) => {
    await app.goto("/index.html");
    await expect(page.locator("h1")).toContainText("Good morning");
    await expect(page.getByTestId("stat-upcoming")).toBeAttached();
  });

  test("lists coaches", async ({ app, page }) => {
    await app.goto("/coaches.html");
    await expect(page.getByTestId("coach-card").first()).toBeVisible();
    expect(await page.getByTestId("coach-card").count()).toBeGreaterThan(0);
  });

  test("book a session with Yuki Tanaka and verify in My Sessions", async ({
    app,
    page,
  }) => {
    // appointment unique identifier
    const appointmentId = `appointment-${Date.now()}`;
    const coachName = "Yuki Tanaka";

    await app.goto("/coaches.html");

    // Find coach Yuki Tanaka and click "Book"
    await page
      .locator('[data-testid="coach-card"]', {
        has: page.locator('[data-testid="coach-name"]', {
          hasText: coachName,
        }),
      })
      .locator("button.book")
      .click();

    // Locate the next available slot
    const nextAvailableSlot = page
      .locator('#slots .slot[data-available="true"]')
      .first();

    // Capture its text (e.g. "5:00 PM")
    const expectedTime = await nextAvailableSlot.textContent();

    // Click it
    await nextAvailableSlot.click();

    await page.click("text=Continue");

    // Wait for the confirm modal to appear
    await page.locator("#confirm-modal.open").waitFor({ state: "visible" });

    // at test ID to notes to identify the booking in My Sessions
    await page.fill('[data-testid="notes"]', appointmentId);

    // Capture the date shown on the confirm modal
    const expectedDate = await page.getByTestId("sum-date").innerText();

    const bookingDuration = "60 minutes";
    const expectedDuration = shortenMinutes(bookingDuration);

    await page.getByTestId("duration").selectOption(bookingDuration);

    // Click the confirm booking button
    await page.locator('[data-testid="confirm-booking"]').click();

    // Wait for the confirm modal to disappear
    await page.locator("#confirm-modal.open").waitFor({ state: "hidden" });

    // Navigate to "My Sessions" tab
    await app.goto("/sessions.html");

    // Verify booking details appear
    const row = page.locator('[data-testid="session-row"]').filter({
      has: page.locator("p.hint", { hasText: appointmentId }),
    });
    await expect(row).toBeVisible();

    await expect.soft(row).toContainText(expectedTime); // currently fails — BUG-01
    await expect.soft(row).toContainText(coachName);
    await expect.soft(row).toContainText(expectedDuration);
    await expect.soft(row).toContainText(expectedDate);
    await expect.soft(row).toContainText("confirmed");
  });
});

function shortenMinutes(str) {
  return str.replace(/\bminutes?\b/gi, "min");
}
