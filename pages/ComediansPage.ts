import { type Locator, type Page } from "@playwright/test";

export class ComediansPage {
  readonly page: Page;
  readonly main: Locator;
  readonly heading: Locator;
  /** One <article> per comedian in the list. */
  readonly cards: Locator;
  readonly allComediansLink: Locator;
  readonly bookLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.main = page.getByRole("main");
    this.heading = page.getByRole("heading", { level: 1 });
    this.cards = this.main.getByRole("listitem").getByRole("article");
    this.allComediansLink = this.main.getByRole("link", { name: "All comedians" });
    this.bookLink = this.main.getByRole("link", { name: "Book ComedyOragon" });
  }

  async goto() {
    await this.page.goto("/comedians");
  }

  async gotoProfile(slug: string) {
    await this.page.goto(`/comedians/${slug}`);
  }

  /** The name link inside a card (the card's H2). */
  cardLink(card: Locator): Locator {
    return card.getByRole("heading", { level: 2 }).getByRole("link");
  }

  card(name: string): Locator {
    return this.cards.filter({ has: this.page.getByRole("heading", { level: 2, name, exact: true }) });
  }
}
