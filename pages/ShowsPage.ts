import { type Locator, type Page } from "@playwright/test";

export class ShowsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly upcoming: Locator;
  readonly upcomingCards: Locator;
  readonly noShowsMessage: Locator;
  readonly requestBookingLink: Locator;
  readonly recent: Locator;
  readonly recentCards: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { level: 1 });
    this.upcoming = page.getByRole("region", { name: "Upcoming shows" });
    this.upcomingCards = this.upcoming.getByRole("article");
    this.noShowsMessage = this.upcoming.getByText("No shows scheduled right now", { exact: true });
    this.requestBookingLink = this.upcoming.getByRole("link", { name: "Request a Booking" });
    this.recent = page.getByRole("region", { name: "Recent shows" });
    this.recentCards = this.recent.getByRole("article");
  }

  async goto() {
    await this.page.goto("/shows");
  }

  showCard(title: string): Locator {
    return this.page.getByRole("article").filter({ has: this.page.getByRole("heading", { name: title, exact: true }) });
  }
}
