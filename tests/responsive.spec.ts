import type { Page } from "@playwright/test";

import { SiteLayout } from "../pages/SiteLayout";
import { comedianProfilePaths, expect, PUBLIC_PAGES, test } from "../helpers/test";

test.use({ viewport: { width: 390, height: 844 } });

async function checkPage(page: Page, path: string) {
  const layout = new SiteLayout(page);
  await page.goto(path);

  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect.soft(overflow.scrollWidth, `${path}: horizontal scroll`).toBeLessThanOrEqual(overflow.clientWidth);

  // CTAs: Book Us and the menu button are on screen; every main link fits the viewport width.
  await expect.soft(layout.bookUsLink).toBeInViewport();
  await expect.soft(layout.openMenuButton).toBeInViewport();
  for (const link of await page.getByRole("main").getByRole("link").all()) {
    const box = await link.boundingBox();
    if (!box) continue; // not rendered (e.g. hidden by design)
    expect.soft(box.x, `${path}: link starts off-screen`).toBeGreaterThanOrEqual(0);
    expect.soft(box.x + box.width, `${path}: link ends off-screen`).toBeLessThanOrEqual(overflow.clientWidth + 1);
  }
}

test.describe("Responsive (390 px)", () => {
  for (const path of PUBLIC_PAGES) {
    test(`RESP-01 ${path} has no horizontal scroll and reachable CTAs`, { tag: "@p2" }, async ({ page }) => {
      await checkPage(page, path);
    });
  }

  test("RESP-01 comedian profiles have no horizontal scroll and reachable CTAs", { tag: "@p2" }, async ({ page }) => {
    for (const path of await comedianProfilePaths(page)) {
      await test.step(path, () => checkPage(page, path));
    }
  });
});
