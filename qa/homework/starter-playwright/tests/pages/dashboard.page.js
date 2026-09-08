class DashboardPage {
  constructor(page, app) {
    this.page = page;
    this.app = app;
    this.heading = page.locator("h1");
    this.upcomingCount = page.getByTestId("stat-upcoming");
    this.nextSession = page.getByTestId("next-session");
    this.nextSessionWhen = page.getByTestId("next-session-when");
  }

  async goto() {
    await this.app.goto("/index.html");
  }
}

module.exports = { DashboardPage };
