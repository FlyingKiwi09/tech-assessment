const { expect } = require("@playwright/test");

class SessionsPage {
  constructor(page, app) {
    this.page = page;
    this.app = app;
    this.sessionRows = page.getByTestId("session-row");
    this.sessionHint = page.locator("p.hint");
    this.sessionStatus = page.getByTestId("session-status");
  }

  async goto() {
    await this.app.goto("/sessions.html");
  }

  async expectBooking(booking) {
    const row = this.sessionRows.filter({
      has: this.sessionHint.filter({ hasText: booking.notes }),
    });

    await expect(row).toBeVisible();
    await expect.soft(row).toContainText(booking.coachName);
    await expect.soft(row).toContainText(booking.expectedDuration);
    await expect.soft(row).toContainText(booking.expectedDate);
    await expect.soft(row).toContainText(booking.expectedTime);
    await expect
      .soft(row.getByTestId("session-status"))
      .toHaveText("confirmed");
  }
}

module.exports = { SessionsPage };
