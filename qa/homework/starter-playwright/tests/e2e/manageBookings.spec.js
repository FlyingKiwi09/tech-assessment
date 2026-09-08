const { test, expect } = require("../support/fixtures");
const { CoachesPage } = require("../pages/coaches.page");
const { BookingFormPage } = require("../pages/booking-form.page");
const { SessionsPage } = require("../pages/sessions.page");

test.describe("e2e: manage bookings", () => {
  test("e2e: booking flow persists correct details in My Sessions", async ({
    app,
    page,
  }) => {
    clear;
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

  test("e2e: cancel booking status updates to cancelled", async ({
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

    await coachesPage.goto();
    await coachesPage.openBookingForCoach(coachName);

    const booking = await bookingForm.bookSession({
      coachName: coachName,
      duration: duration,
      date: "next available",
      time: "next available",
      notes: appointmentId,
    });

    //act
    await sessionsPage.goto();
    await sessionsPage.cancelBooking(appointmentId);

    //assert
    await sessionsPage.expectBookingStatus(appointmentId, "cancelled");
  });

  test("e2e: reschedule booking persists correct details in My Sessions", async ({
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

    await coachesPage.goto();
    await coachesPage.openBookingForCoach(coachName);

    const booking = await bookingForm.bookSession({
      coachName: coachName,
      duration: duration,
      date: "next available",
      time: "next available",
      notes: appointmentId,
    });

    await sessionsPage.goto();

    //act
    const rescheduledBooking = await sessionsPage.rescheduleBooking(
      appointmentId,
      { excludeDate: booking.date },
    );

    //assert
    await sessionsPage.expectBooking({
      notes: appointmentId,
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
    const appointmentId = `appointment-${Date.now()}`;
    const coachesPage = new CoachesPage(page, app);
    const bookingForm = new BookingFormPage(page);
    const sessionsPage = new SessionsPage(page, app);
    const coachName = "Yuki Tanaka";
    const duration = 60;

    await coachesPage.goto();
    await coachesPage.openBookingForCoach(coachName);

    const booking = await bookingForm.bookSession({
      coachName: coachName,
      duration: duration,
      date: "next available",
      time: "next available",
      notes: appointmentId,
    });
    const originalSession = (await app.sessions()).find(
      ({ notes }) => notes === appointmentId,
    );

    await sessionsPage.goto();

    //act
    await sessionsPage.rescheduleBooking(appointmentId, {
      excludeDate: booking.date,
      abort: true,
    });

    //assert
    await expect(app.sessions()).resolves.toEqual(
      expect.arrayContaining([originalSession]),
    );
  });
});
