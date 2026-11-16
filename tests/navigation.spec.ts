import { HomePage } from "../pages/HomePage";
import { SiteLayout } from "../pages/SiteLayout";
import { comedianProfilePaths, expect, PUBLIC_PAGES, test } from "../helpers/test";

const MAIN_NAV = [
  { name: "Home", path: "/", h1: "ComedyOragon logo" }, // the home H1 is the logo image
  { name: "About", path: "/about", h1: "About" },
  { name: "Comedians", path: "/comedians", h1: "The Comedians" },
  { name: "Shows", path: "/shows", h1: "Shows" },
  { name: "Contact", path: "/contact", h1: "Contact" },
];

const pathOf = (url: string) => new URL(url).pathname;

test.describe("Navigation", () => {
  test("NAV-01 home page loads with title and hero CTAs", { tag: "@p1" }, async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await expect(page).toHaveTitle(/ComedyOragon/);
    await expect(home.hero).toBeVisible();
    await expect(home.bookButton).toBeVisible();
    await expect(home.upcomingShowsButton).toBeVisible();
    await expect(home.meetComediansLink).toBeVisible();
  });

  test("NAV-02 header links open the right route and H1", { tag: "@p1" }, async ({ page }) => {
    const layout = new SiteLayout(page);
    // Start somewhere other than Home so the Home link really navigates.
    await page.goto("/contact");
    for (const item of [...MAIN_NAV.slice(1), MAIN_NAV[0]]) {
      await test.step(item.name, async () => {
        await layout.navigate(item.name);
        await expect.poll(() => pathOf(page.url())).toBe(item.path);
        await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName(item.h1);
      });
    }
  });

  test("NAV-03 Book Us opens /book from every page", { tag: "@p1" }, async ({ page }) => {
    test.slow(); // ~20 navigations; Firefox/WebKit on the dev server need more than 60 s
    const layout = new SiteLayout(page);
    const profiles = await comedianProfilePaths(page);
    // /book goes last: clicking Book Us there reloads the same route, which would
    // otherwise interrupt the next step's navigation.
    const pages = [...PUBLIC_PAGES.filter((p) => p !== "/book"), ...profiles, "/book"];
    for (const path of pages) {
      await test.step(path, async () => {
        await page.goto(path);
        await layout.bookUsLink.click();
        await expect.poll(() => pathOf(page.url())).toBe("/book");
        await expect(page.getByRole("heading", { level: 1, name: "Request a Booking" })).toBeVisible();
      });
    }
  });

  test.describe("at 390 px", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("NAV-04 mobile menu opens, links work, closes after navigation", { tag: "@p1" }, async ({ page }) => {
      const layout = new SiteLayout(page);
      await page.goto("/");
      await expect(layout.headerNav).toBeHidden();

      for (const item of MAIN_NAV.slice(1)) {
        await test.step(item.name, async () => {
          await layout.openMenuButton.click();
          await expect(layout.mobileMenu).toBeVisible();
          await layout.mobileMenu.getByRole("link", { name: item.name, exact: true }).click();
          await expect.poll(() => pathOf(page.url())).toBe(item.path);
          await expect(page.getByRole("heading", { level: 1 })).toHaveAccessibleName(item.h1);
          await expect(layout.mobileMenu).toBeHidden();
        });
      }

      await test.step("Close button", async () => {
        await layout.openMenuButton.click();
        await expect(layout.mobileMenu).toBeVisible();
        await layout.closeMenuButton.click();
        await expect(layout.mobileMenu).toBeHidden();
      });
    });
  });

  test("NAV-05 footer links match header and copyright shows current year", { tag: "@p2" }, async ({ page }) => {
    const layout = new SiteLayout(page);
    await page.goto("/");
    const headerLinks = await layout.headerNavLinks();
    expect(headerLinks.map((l) => l.name)).toEqual(MAIN_NAV.map((n) => n.name));
    expect(await layout.footerNavLinks()).toEqual(headerLinks);
    await expect(layout.copyright).toContainText(`© ${new Date().getFullYear()} ComedyOragon`);
  });

  test.describe("skip link", () => {
    test.beforeEach(({ browserName }) => {
      test.skip(
        browserName === "webkit",
        "Playwright WebKit never moves Tab focus to links (Safari's default 'Press Tab to highlight each item' is off), so the skip link can't be reached by keyboard here.",
      );
    });

    test("NAV-06 skip to content: Tab then Enter jumps past the header", { tag: "@p2" }, async ({ page }) => {
      const layout = new SiteLayout(page);
      await page.goto("/");
      await page.keyboard.press("Tab");
      await expect(layout.skipLink).toBeFocused();
      await expect(layout.skipLink).toBeVisible();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/#content$/);
      // The next Tab lands on the first link inside the content, not in the header.
      await page.keyboard.press("Tab");
      await expect(page.getByRole("main").getByRole("link", { name: "Book ComedyOragon" })).toBeFocused();
    });

    test(
      "NAV-06 skip to content moves focus to #content",
      {
        tag: "@p2",
        annotation: {
          type: "defect",
          description:
            "NEW: <main id=\"content\"> has no tabindex=\"-1\", so activating the skip link leaves focus on <body> (Chromium, Firefox) instead of #content; screen readers don't announce the jump. The next Tab still lands inside main.",
        },
      },
      async ({ page }) => {
        test.fail();
        const layout = new SiteLayout(page);
        await page.goto("/");
        await page.keyboard.press("Tab");
        await expect(layout.skipLink).toBeFocused();
        await page.keyboard.press("Enter");
        await expect(page).toHaveURL(/#content$/);
        await expect(layout.content).toBeFocused({ timeout: 3_000 });
      },
    );
  });

  test.describe("404 page", () => {
    test("NAV-08 unknown route shows a 404 page with a link home", { tag: "@p2" }, async ({ page }) => {
      const response = await page.goto("/does-not-exist");
      expect(response?.status()).toBe(404);
      await expect(page.getByRole("heading", { level: 1, name: "This page bombed" })).toBeVisible();
      await page.getByRole("link", { name: "Back to home" }).click();
      await expect.poll(() => pathOf(page.url())).toBe("/");
    });

    test(
      "NAV-08 404 page renders one header, main and footer",
      {
        tag: "@p2",
        annotation: {
          type: "defect",
          description:
            "NEW: unknown routes render app/not-found.tsx (its own header, <main id=content> and footer) inside the public layout's <main>, so the page has two headers, two footers, nested <main> elements and duplicate id=content. Title is 'ComedyOragon' instead of 'Page not found'.",
        },
      },
      async ({ page }) => {
        test.fail();
        await page.goto("/does-not-exist");
        await expect.soft(page.getByRole("main")).toHaveCount(1);
        await expect.soft(page.getByRole("navigation", { name: "Main" })).toHaveCount(1);
        await expect.soft(page.getByRole("navigation", { name: "Footer" })).toHaveCount(1);
        await expect.soft(page).toHaveTitle(/Page not found/);
      },
    );
  });
});

test.describe("Navigation (production content)", () => {
  test("NAV-07 Facebook link opens facebook.com/bicolstandup in a new tab", { tag: ["@p2", "@prod-content"] }, async ({ page, context }) => {
    // Never load Facebook itself: answer the new tab with a stub page.
    await context.route(/facebook\.com/, (route) => route.fulfill({ contentType: "text/html", body: "<title>stub</title>" }));
    await page.goto("/contact");
    const link = page.getByRole("main").getByRole("link", { name: /^Facebook/ });
    await expect(link).toHaveAttribute("href", /^https:\/\/(www\.)?facebook\.com\/bicolstandup\/?$/);
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /\bnoopener\b/);

    const [tab] = await Promise.all([context.waitForEvent("page"), link.click()]);
    await expect(tab).toHaveURL(/facebook\.com\/bicolstandup/);
    expect(page.url()).toMatch(/\/contact$/);
  });
});
