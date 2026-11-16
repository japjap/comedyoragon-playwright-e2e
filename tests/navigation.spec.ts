import { expect, test } from "@playwright/test";
import { HomePage } from "../pages/HomePage";

test.describe("Navigation", () => {
  test("NAV-01 home page loads with title and hero CTAs", async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    await expect(page).toHaveTitle(/ComedyOragon/);
    await expect(home.hero).toBeVisible();
    await expect(home.bookButton).toBeVisible();
    await expect(home.upcomingShowsButton).toBeVisible();
    await expect(home.meetComediansLink).toBeVisible();
  });
});
