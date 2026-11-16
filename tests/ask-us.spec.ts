import { SiteLayout } from "../pages/SiteLayout";
import { expect, test } from "../helpers/test";

test.describe("Ask us", () => {
  test("ASK-01 Ask us opens the chatbot panel, closes, and the page stays usable", { tag: "@p3" }, async ({ page }) => {
    const layout = new SiteLayout(page);
    await page.goto("/");

    await layout.chatLauncher.click();
    await expect(layout.chatPanel).toBeVisible();
    await expect(page.getByRole("button", { name: "Close chat" }).first()).toHaveAttribute("aria-expanded", "true");

    await layout.chatPanel.getByRole("button", { name: "Close chat" }).click();
    await expect(layout.chatPanel).toBeHidden();
    await expect(layout.chatLauncher).toBeFocused();
    await expect(layout.chatLauncher).toHaveAttribute("aria-expanded", "false");

    // Page still works: navigate somewhere.
    await layout.bookUsLink.click();
    await expect.poll(() => new URL(page.url()).pathname).toBe("/book");
    await expect(page.getByRole("heading", { level: 1, name: "Request a Booking" })).toBeVisible();
  });
});
