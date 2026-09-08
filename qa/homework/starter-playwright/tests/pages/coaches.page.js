const { expect } = require("@playwright/test");

class CoachesPage {
  constructor(page, app) {
    this.page = page;
    this.app = app;
    this.searchInput = page.getByTestId("filter-search");
    this.resultCount = page.getByTestId("result-count");
    this.coachCards = page.getByTestId("coach-card");
    this.coachName = page.getByTestId("coach-name");
  }

  async goto() {
    await this.app.goto("/coaches.html");
  }

  async search(query) {
    await this.searchInput.fill(query);
    await expect(this.resultCount).toHaveText(/^\d+ coaches found$/);

    return this.coachCards;
  }

  async openBookingForCoach(coachName) {
    const coachCards = await this.search(coachName);
    const card = coachCards.filter({
      has: this.coachName.filter({ hasText: coachName }),
    });

    await expect(card).toBeVisible();
    await card.locator("button.book").click();
  }
}

module.exports = { CoachesPage };
