const { expect } = require("@playwright/test");

const NEXT_AVAILABLE = "next available";
const VALID_DURATIONS = [30, 60];

class BookingFormPage {
  constructor(page) {
    this.page = page;
    this.days = page.locator("#days .day");
    this.daysContainer = page.locator("#days");
    this.slotsContainer = page.getByTestId("slot-grid");
    this.slots = page.locator('#slots .slot[data-available="true"]');
    this.bookingCoach = page.getByTestId("booking-coach");
    this.continueButton = page.getByTestId("continue");
    this.confirmModal = page.locator("#confirm-modal.open");
    this.summaryDate = page.getByTestId("sum-date");
    this.summaryTime = page.getByTestId("sum-time");
    this.notesInput = page.getByTestId("notes");
    this.guestEmailInput = page.getByTestId("guest-email");
    this.durationSelect = page.getByTestId("duration");
    this.cancelButton = page.getByRole("button", { name: "Back" });
    this.confirmButton = page.getByTestId("confirm-booking");
  }

  async bookSession({
    coachName,
    duration = 60,
    date = NEXT_AVAILABLE,
    time = NEXT_AVAILABLE,
    notes,
    guestEmail,
    abort = false,
  }) {
    this.validateDuration(duration);
    // Use a unique notes value to identify the booking in the sessions list
    const bookingNotes = notes || `booking-${Date.now()}`;

    await expect(this.bookingCoach).toHaveText(coachName);

    const selectedDate = await this.selectDate(date);
    const selectedTime = await this.selectTime(time);

    await this.continueButton.click();
    await expect(this.confirmModal).toBeVisible();

    const expectedDate = await this.summaryDate.innerText();
    const expectedTime = await this.summaryTime.innerText();

    await this.notesInput.fill(bookingNotes);
    if (guestEmail !== undefined) {
      await this.guestEmailInput.fill(guestEmail);
    }

    await this.durationSelect.selectOption(String(duration));
    if (abort) {
      await this.cancelButton.click();
    } else {
      await this.confirmButton.click();
    }
    await expect(this.confirmModal).toBeHidden();

    return {
      coachName,
      date: selectedDate,
      time: selectedTime,
      expectedDate,
      expectedTime,
      expectedDuration: `${duration} min`,
      notes: bookingNotes,
    };
  }

  validateDuration(duration) {
    if (!VALID_DURATIONS.includes(duration)) {
      throw new Error(`duration must be one of: ${VALID_DURATIONS.join(", ")}`);
    }
  }

  async selectDate(date) {
    const availableDates = await this.days.evaluateAll((buttons) =>
      buttons.map((button) => button.getAttribute("data-day")),
    );

    if (date !== NEXT_AVAILABLE && !availableDates.includes(date)) {
      throw new Error(`date must be within the next 7 days: ${date}`);
    }

    const datesToTry = date === NEXT_AVAILABLE ? availableDates : [date];
    let previousSlots = await this.slotsContainer.innerHTML();

    for (const candidate of datesToTry) {
      await this.daysContainer.locator(`[data-day="${candidate}"]`).click();
      await this.waitForSlotsToLoad(previousSlots);
      previousSlots = await this.slotsContainer.innerHTML();

      if (await this.slots.count()) {
        return candidate;
      }
    }

    throw new Error(`no available slots found for ${date}`);
  }

  async selectTime(time) {
    const availableSlot = this.slots.filter({ hasText: time }).first();
    const slot = time === NEXT_AVAILABLE ? this.slots.first() : availableSlot;

    if (!(await slot.count())) {
      throw new Error(`time is not available on the selected date: ${time}`);
    }

    const selectedTime = await slot.innerText();
    await slot.click();
    return selectedTime;
  }

  async waitForSlotsToLoad(previousSlots) {
    await expect
      .poll(() => this.slotsContainer.innerHTML())
      .not.toBe(previousSlots);
  }
}

module.exports = { BookingFormPage, NEXT_AVAILABLE };
