const { expect } = require("@playwright/test");

class SessionsPage {
  constructor(page, app) {
    this.page = page;
    this.app = app;
    this.sessionRows = page.getByTestId("session-row");
    this.sessionHint = page.locator("p.hint");
    this.sessionStatus = page.getByTestId("session-status");
    this.rescheduleModal = page.locator("#reschedule-modal.open");
    this.rescheduleDay = page.getByTestId("resched-day");
    this.rescheduleTime = page.getByTestId("resched-hour");
    this.cancelRescheduleButton = page.getByRole("button", { name: "Back" });
    this.saveRescheduleButton = page.getByTestId("resched-save");
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
    await expect.soft(row.getByTestId("session-status")).toHaveText(status);
  }

  async cancelBooking(notes) {
    const row = this.bookingRow(notes);

    await row.getByRole("button", { name: "Cancel" }).click();
  }

  async expectBookingStatus(notes, expectedStatus) {
    const row = this.bookingRow(notes);

    await expect(row.getByTestId("session-status")).toHaveText(expectedStatus);
  }

  async rescheduleBooking(notes, { excludeDate, abort = false } = {}) {
    const row = this.bookingRow(notes);
    await row.getByRole("button", { name: "Reschedule" }).click();
    await expect(this.rescheduleModal).toBeVisible();

    const dateOptions = await this.rescheduleDay
      .locator("option")
      .evaluateAll((options) => options.map((option) => option.value));
    const newDate = dateOptions.find((date) => date !== excludeDate);

    if (!newDate) {
      throw new Error("no different reschedule date is available");
    }

    await this.rescheduleDay.selectOption(newDate);
    await expect(this.rescheduleTime.locator("option")).not.toHaveCount(0);

    const newTime = await this.rescheduleTime
      .locator("option")
      .first()
      .getAttribute("value");
    const expectedTime = await this.rescheduleTime
      .locator("option")
      .first()
      .innerText();

    await this.rescheduleTime.selectOption(newTime);
    if (abort) {
      await this.cancelRescheduleButton.click();
    } else {
      await this.saveRescheduleButton.click();
    }
    await expect(this.rescheduleModal).toBeHidden();

    return {
      date: this.formatDateEU(newDate),
      time: expectedTime,
    };
  }

  bookingRow(notes) {
    return this.sessionRows.filter({
      has: this.sessionHint.filter({ hasText: notes }),
    });
  }

  formatDateEU(date) {
    const [, year, month, day] = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return `${day}/${month}/${year}`;
  }
}

module.exports = { SessionsPage };
