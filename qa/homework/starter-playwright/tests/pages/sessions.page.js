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

  async expectBooking({ notes, coachName, duration, date, time, status }) {
    const row = this.sessionRows.filter({
      has: this.sessionHint.filter({ hasText: notes }),
    });

    await expect(row).toBeVisible();
    await expect.soft(row).toContainText(coachName);
    await expect.soft(row).toContainText(duration);
    await expect.soft(row).toContainText(date);
    await expect.soft(row).toContainText(time);
    await expect
      .soft(row.getByTestId("session-status"))
      .toHaveText(status);
  }
}

module.exports = { SessionsPage };
