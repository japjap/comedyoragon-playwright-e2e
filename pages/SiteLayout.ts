import { type Locator, type Page } from "@playwright/test";

/** Header, footer, mobile menu, skip link and chat launcher shared by every public page. */
export class SiteLayout {
  readonly page: Page;
  readonly header: Locator;
  readonly headerNav: Locator;
  readonly bookUsLink: Locator;
  readonly footer: Locator;
  readonly footerNav: Locator;
  readonly copyright: Locator;
  readonly skipLink: Locator;
  readonly content: Locator;
  readonly openMenuButton: Locator;
  readonly closeMenuButton: Locator;
  readonly mobileMenu: Locator;
  readonly chatLauncher: Locator;
  readonly chatPanel: Locator;

  constructor(page: Page) {
    this.page = page;
    this.header = page.getByRole("banner");
    this.headerNav = this.header.getByRole("navigation", { name: "Main" });
    this.bookUsLink = this.header.getByRole("link", { name: "Book Us" });
    this.footer = page.getByRole("contentinfo");
    this.footerNav = this.footer.getByRole("navigation", { name: "Footer" });
    this.copyright = this.footer.getByText(/©/);
    this.skipLink = page.getByRole("link", { name: "Skip to content" });
    // The skip link's target; the plan names it by id.
    this.content = page.locator("#content");
    this.openMenuButton = page.getByRole("button", { name: "Open menu" });
    this.closeMenuButton = page.getByRole("button", { name: "Close menu" });
    this.mobileMenu = page.getByRole("dialog", { name: "Menu" });
    // Visible text is "Ask us" (desktop only); the accessible name is "Open chat".
    this.chatLauncher = page.getByRole("button", { name: "Open chat" });
    this.chatPanel = page.getByRole("dialog", { name: /ComedyOragon Assistant/ });
  }

  /** Header nav link names and hrefs (read from the DOM, so it works while the nav is hidden on mobile). */
  async headerNavLinks(): Promise<{ name: string; href: string }[]> {
    // On small screens the header nav is display:none, so include hidden elements.
    // The first match is the header nav; the mobile menu's copy comes later in the DOM.
    return this.header
      .getByRole("navigation", { name: "Main", includeHidden: true })
      .first()
      .getByRole("link", { includeHidden: true })
      .evaluateAll((els) => els.map((el) => ({ name: el.textContent?.trim() ?? "", href: el.getAttribute("href") ?? "" })));
  }

  async footerNavLinks(): Promise<{ name: string; href: string }[]> {
    return this.footerNav
      .getByRole("link")
      .evaluateAll((els) => els.map((el) => ({ name: el.textContent?.trim() ?? "", href: el.getAttribute("href") ?? "" })));
  }

  /** Follows a main-nav link: through the header on desktop, through the menu on small screens. */
  async navigate(linkName: string) {
    if (await this.openMenuButton.isVisible()) {
      await this.openMenuButton.click();
      await this.mobileMenu.getByRole("link", { name: linkName, exact: true }).click();
    } else {
      await this.headerNav.getByRole("link", { name: linkName, exact: true }).click();
    }
  }
}
