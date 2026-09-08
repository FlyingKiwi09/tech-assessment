const { test, expect } = require("../support/fixtures");
const { CoachesPage } = require("../pages/coaches.page");
const { BookingFormPage } = require("../pages/booking-form.page");
const { SessionsPage } = require("../pages/sessions.page");

test.describe("e2e: create bookings", () => {
  test("e2e: booking flow persists correct details in My Sessions", async ({
    app,
    page,
  }) => {
    //arrange
    const appointmentId = `appointment-${Date.now()}`;
    const coachesPage = new CoachesPage(page, app);
    const bookingForm = new BookingFormPage(page);
    const coachName = "Yuki Tanaka";
    const duration = 60;

    //act
    await coachesPage.goto();
    await coachesPage.openBookingForCoach(coachName);

    const booking = await bookingForm.bookSession({
      coachName: coachName,
      duration: duration,
      date: "next available",
      time: "next available",
      notes: appointmentId,
    });

    //assert
    await sessionsPage.goto();
    await sessionsPage.expectBooking({
      notes: appointmentId,
      coachName,
      duration: `${duration} min`,
      date: booking.expectedDate,
      time: booking.expectedTime,
      status: "confirmed",
    });
  });

  test("e2e: aborted booking flow does not create a booking in My Sessions", async ({
    app,
    page,
  }) => {
    //arrange
    const appointmentId = `appointment-${Date.now()}`;
    const coachesPage = new CoachesPage(page, app);
    const bookingForm = new BookingFormPage(page);
    const sessionsPage = new SessionsPage(page, app);
    const coachName = "Yuki Tanaka";
    const duration = 60;

    //act
    await coachesPage.goto();
    await coachesPage.openBookingForCoach(coachName);

    const booking = await bookingForm.bookSession({
      coachName: coachName,
      duration: duration,
      date: "next available",
      time: "next available",
      notes: appointmentId,
      abort: true,
    });

    //assert
    await sessionsPage.goto();
    await expect(sessionsPage.bookingRow(booking.notes)).toHaveCount(0);
  });

  test("e2e: booking flow updates available slots", async ({ app, page }) => {
    //arrange
    const appointmentId = `appointment-${Date.now()}`;
    const coachesPage = new CoachesPage(page, app);
    const bookingForm = new BookingFormPage(page);
    const coachName = "Yuki Tanaka";
    const duration = 60;

    //act
    await coachesPage.goto();
    await coachesPage.openBookingForCoach(coachName);

    const booking = await bookingForm.bookSession({
      coachName: coachName,
      duration: duration,
      date: "next available",
      time: "next available",
      notes: appointmentId,
    });

    //assert
    await coachesPage.goto();
    await coachesPage.openBookingForCoach(coachName);
    await bookingForm.selectDate(booking.date);

    await expect(bookingForm.selectTime(booking.time)).rejects.toThrow(
      `time is not available on the selected date: ${booking.time}`,
    );
  });
});
