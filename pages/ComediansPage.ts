import { type Locator, type Page } from "@playwright/test";

export class ComediansPage {
  readonly page: Page;
  readonly main: Locator;
  readonly heading: Locator;
  readonly allComediansLink: Locator;
  readonly bookLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.main = page.getByRole("main");
    this.heading = page.getByRole("heading", { level: 1 });
    this.allComediansLink = page.getByRole("link", { name: /all comedians/i });
    this.bookLink = this.main.getByRole("link", { name: "Book ComedyOragon" });
  }

  async goto() {
    await this.page.goto("/comedians");
  }

  async gotoProfile(slug: string) {
    await this.page.goto(`/comedians/${slug}`);
  }

  /** A comedian card's link, found by the comedian's name. */
  comedianLink(name: string | RegExp): Locator {
    return this.main.getByRole("link", { name });
  }
}
