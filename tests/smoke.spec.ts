import type { Page } from "@playwright/test";

import { BookingPage } from "../pages/BookingPage";
import { comedianProfilePaths, expect, PUBLIC_PAGES, test } from "../helpers/test";

/*
 * Production smoke (project "prod-smoke"). Read-only: pages are only loaded,
 * never filled or submitted. The read-only guard in helpers/test.ts aborts any
 * non-GET request to comedyoragon.com as a second line of defence.
 */

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
  });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  return errors;
}

test.describe("Production smoke", () => {
  test("SMK-01 all public pages return 200 with no console errors", { tag: ["@p1", "@smoke"] }, async ({ page, readOnlyGuard }) => {
    const errors = collectErrors(page);
    const paths = [...PUBLIC_PAGES, ...(await comedianProfilePaths(page))];
    for (const path of paths) {
      await test.step(path, async () => {
        const response = await page.goto(path);
        expect.soft(response?.status(), `${path} status`).toBe(200);
        await expect.soft(page.getByRole("heading", { level: 1 })).toBeVisible();
      });
    }
    expect(errors).toEqual([]);
    expect(readOnlyGuard.blocked.filter((r) => r.includes("/book"))).toEqual([]);
  });

  test("SMK-02 book page renders the form and the Send Booking Request button", { tag: ["@p1", "@smoke"] }, async ({ page }) => {
    const booking = new BookingPage(page);
    await booking.goto();
    await expect(booking.heading).toBeVisible();
    for (const field of [booking.eventType, booking.date, booking.startTime, booking.venueName, booking.contactName, booking.contactEmail]) {
      await expect(field).toBeVisible();
    }
    await expect(booking.submitButton).toBeVisible();
    await expect(booking.submitButton).toHaveText("Send Booking Request");
    // Deliberately no fill() or click(): production is read-only.
  });
});
