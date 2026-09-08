const { test, expect } = require("../support/fixtures");
const { CoachesPage } = require("../pages/coaches.page");
const { BookingFormPage } = require("../pages/booking-form.page");
const { SessionsPage } = require("../pages/sessions.page");

const coachName = "Yuki Tanaka";
const duration = 60;

function createBookingContext({ app, page }) {
  const appointmentId = `appointment-${Date.now()}`;

  return {
    appointmentId,
    bookingDetails: {
      coachName,
      duration,
      date: "next available",
      time: "next available",
      notes: appointmentId,
    },
    coachesPage: new CoachesPage(page, app),
    bookingForm: new BookingFormPage(page),
    sessionsPage: new SessionsPage(page, app),
  };
}

test.describe("e2e: create bookings", () => {
  test("e2e: booking flow persists correct details in My Sessions", async ({
    app,
    page,
  }) => {
    //arrange
    const context = createBookingContext({ app, page });

    //act
    await context.coachesPage.goto();
    await context.coachesPage.openBookingForCoach(coachName);

    const booking = await context.bookingForm.bookSession(
      context.bookingDetails,
    );

    //assert
    await context.sessionsPage.goto();
    await context.sessionsPage.expectBooking({
      notes: context.appointmentId,
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
    const context = createBookingContext({ app, page });

    //act
    await context.coachesPage.goto();
    await context.coachesPage.openBookingForCoach(coachName);

    const booking = await context.bookingForm.bookSession({
      ...context.bookingDetails,
      abort: true,
    });

    //assert
    await context.sessionsPage.goto();
    await expect(context.sessionsPage.bookingRow(booking.notes)).toHaveCount(0);
  });

  test("e2e: booking flow updates available slots", async ({ app, page }) => {
    //arrange
    const context = createBookingContext({ app, page });

    //act
    await context.coachesPage.goto();
    await context.coachesPage.openBookingForCoach(coachName);

    const booking = await context.bookingForm.bookSession(
      context.bookingDetails,
    );

    //assert
    await context.coachesPage.goto();
    await context.coachesPage.openBookingForCoach(coachName);
    await context.bookingForm.selectDate(booking.date);

    await expect(context.bookingForm.selectTime(booking.time)).rejects.toThrow(
      `time is not available on the selected date: ${booking.time}`,
    );
  });
});
