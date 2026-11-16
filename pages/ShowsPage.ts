import { type Locator, type Page } from "@playwright/test";

export class ShowsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly noShowsHeading: Locator;
  readonly requestBookingLink: Locator;
  readonly pastShowLabels: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { level: 1 });
    this.noShowsHeading = page.getByRole("heading", { name: "No shows scheduled right now" });
    this.requestBookingLink = page.getByRole("link", { name: "Request a Booking" });
    this.pastShowLabels = page.getByText("Past show", { exact: true });
  }

  async goto() {
    await this.page.goto("/shows");
  }
}
