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

async function arrangeBooking(context) {
  const { bookingDetails, bookingForm, coachesPage } = context;

  await coachesPage.goto();
  await coachesPage.openBookingForCoach(coachName);

  context.booking = await bookingForm.bookSession(bookingDetails);
}

test.describe("e2e: manage bookings", () => {
  test("e2e: cancel booking status updates to cancelled", async ({
    app,
    page,
  }) => {
    //arrange
    const context = createBookingContext({ app, page });
    await arrangeBooking(context);

    //act
    await context.sessionsPage.goto();
    await context.sessionsPage.cancelBooking(context.appointmentId);

    //assert
    await context.sessionsPage.expectBookingStatus(
      context.appointmentId,
      "cancelled",
    );
  });

  test("e2e: cancel booking time slot is released", async ({ app, page }) => {
    //arrange
    const context = createBookingContext({ app, page });
    await arrangeBooking(context);

    //act
    await context.sessionsPage.goto();
    await context.sessionsPage.cancelBooking(context.appointmentId);

    await context.coachesPage.goto();
    await context.coachesPage.openBookingForCoach(coachName);
    await context.bookingForm.selectDate(context.booking.date);

    await expect(
      context.bookingForm.selectTime(context.booking.time),
    ).resolves.toBe(context.booking.time);
  });

  test("e2e: reschedule booking updates correct details in My Sessions", async ({
    app,
    page,
  }) => {
    //arrange
    const context = createBookingContext({ app, page });
    await arrangeBooking(context);

    await context.sessionsPage.goto();

    //act
    const rescheduledBooking = await context.sessionsPage.rescheduleBooking(
      context.appointmentId,
      { excludeDate: context.booking.date },
    );

    //assert
    await context.sessionsPage.expectBooking({
      notes: context.appointmentId,
      coachName,
      duration: `${duration} min`,
      date: rescheduledBooking.date,
      time: rescheduledBooking.time,
      status: "confirmed",
    });
  });

  test("e2e: aborted reschedule does not update booking", async ({
    app,
    page,
  }) => {
    //arrange
    const context = createBookingContext({ app, page });
    await arrangeBooking(context);
    const originalSession = (await app.sessions()).find(
      ({ notes }) => notes === context.appointmentId,
    );

    await context.sessionsPage.goto();

    //act
    await context.sessionsPage.rescheduleBooking(context.appointmentId, {
      excludeDate: context.booking.date,
      abort: true,
    });

    //assert
    await expect(app.sessions()).resolves.toEqual(
      expect.arrayContaining([originalSession]),
    );
  });
});
