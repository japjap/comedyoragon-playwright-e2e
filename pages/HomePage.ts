import { type Locator, type Page } from "@playwright/test";

export class HomePage {
  readonly page: Page;
  /** The hero <section> is labelled by the H1, whose accessible name is the logo alt text. */
  readonly hero: Locator;
  readonly bookButton: Locator;
  readonly upcomingShowsButton: Locator;
  readonly meetComediansLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.hero = page.getByRole("region", { name: "ComedyOragon logo" });
    // These labels also appear further down the page, so scope them to the hero.
    this.bookButton = this.hero.getByRole("link", { name: "Book ComedyOragon" });
    this.upcomingShowsButton = this.hero.getByRole("link", { name: "See Upcoming Shows" });
    this.meetComediansLink = this.hero.getByRole("link", { name: "Meet the Comedians" });
  }

  async goto() {
    await this.page.goto("/");
  }
}
