import { test as base, expect, type Page } from "@playwright/test";

/*
 * Shared test object. Every spec imports `test` from here so the production
 * read-only guard is always active: against comedyoragon.com, any request other
 * than GET/HEAD/OPTIONS is aborted before it leaves the browser, and a blocked
 * booking submission (Server Action) fails the test.
 */

export const PRODUCTION_URL = "https://comedyoragon.com";

export function isProduction(url: string | undefined): boolean {
  if (!url) return false;
  const host = new URL(url).hostname;
  return host === "comedyoragon.com" || host.endsWith(".comedyoragon.com");
}

type Fixtures = { readOnlyGuard: { blocked: string[] } };

export const test = base.extend<Fixtures>({
  readOnlyGuard: [
    async ({ context, baseURL }, use, testInfo) => {
      const blocked: string[] = [];
      const blockedSubmissions: string[] = [];
      if (isProduction(baseURL)) {
        await context.route(
          (url) => isProduction(url.href),
          async (route) => {
            const request = route.request();
            if (["GET", "HEAD", "OPTIONS"].includes(request.method())) return route.fallback();
            blocked.push(`${request.method()} ${request.url()}`);
            if (request.headers()["next-action"]) blockedSubmissions.push(request.url());
            return route.abort("blockedbyclient");
          },
        );
      }
      await use({ blocked });
      for (const entry of blocked) testInfo.annotations.push({ type: "blocked (read-only)", description: entry });
      expect(blockedSubmissions, "a form submission was attempted against production").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/** Public pages with a fixed route. Comedian profiles are discovered from /comedians. */
export const PUBLIC_PAGES = ["/", "/about", "/comedians", "/shows", "/contact", "/book"] as const;

/** Profile paths linked from the comedians list, e.g. ["/comedians/rc", ...]. */
export async function comedianProfilePaths(page: Page): Promise<string[]> {
  await page.goto("/comedians");
  const links = page.getByRole("main").getByRole("listitem").getByRole("heading").getByRole("link");
  const hrefs = await links.evaluateAll((els) => els.map((el) => el.getAttribute("href") ?? ""));
  return hrefs.filter((href) => href.startsWith("/comedians/"));
}

/** Booking flows must never run against production. */
export function skipOnProduction(baseURL: string | undefined) {
  test.skip(isProduction(baseURL), "Booking form is never filled or submitted on production.");
}
