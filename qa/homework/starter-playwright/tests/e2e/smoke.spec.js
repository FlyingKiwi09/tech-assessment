const { test, expect } = require("../support/fixtures");
const { CoachesPage } = require("../pages/coaches.page");
const { BookingFormPage } = require("../pages/booking-form.page");
const { SessionsPage } = require("../pages/sessions.page");

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
    const appointmentId = `appointment-${Date.now()}`;
    const coachesPage = new CoachesPage(page, app);
    const bookingForm = new BookingFormPage(page);
    const sessionsPage = new SessionsPage(page, app);

    await coachesPage.goto();
    await coachesPage.openBookingForCoach("Yuki Tanaka");

    const booking = await bookingForm.bookSession({
      coachName: "Yuki Tanaka",
      duration: 60,
      date: "next available",
      time: "next available",
      notes: appointmentId,
    });

    await sessionsPage.goto();
    await sessionsPage.expectBooking(booking);
  });
});
