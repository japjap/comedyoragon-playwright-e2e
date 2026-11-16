import { ComediansPage } from "../pages/ComediansPage";
import { expect, test } from "../helpers/test";

test.describe("Comedians", () => {
  test("COM-02 each card opens its profile with a matching H1", { tag: "@p1" }, async ({ page }) => {
    const comedians = new ComediansPage(page);
    await comedians.goto();
    const count = await comedians.cards.count();
    expect(count, "comedians list is empty").toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const link = comedians.cardLink(comedians.cards.nth(i));
      const name = (await link.textContent())?.trim() ?? "";
      await test.step(name, async () => {
        const href = await link.getAttribute("href");
        expect(href).toMatch(/^\/comedians\/[a-z0-9-]+$/);
        await link.click();
        await expect.poll(() => new URL(page.url()).pathname).toBe(href);
        await expect(comedians.heading).toHaveText(name);
        await comedians.goto();
      });
    }
  });

  test("COM-03 profile links: All comedians and Book ComedyOragon", { tag: "@p2" }, async ({ page }) => {
    const comedians = new ComediansPage(page);
    await comedians.goto();
    const href = await comedians.cardLink(comedians.cards.first()).getAttribute("href");

    await page.goto(href!);
    await comedians.allComediansLink.click();
    await expect.poll(() => new URL(page.url()).pathname).toBe("/comedians");
    await expect(comedians.heading).toHaveText("The Comedians");

    await page.goto(href!);
    await comedians.bookLink.click();
    await expect.poll(() => new URL(page.url()).pathname).toBe("/book");
  });
});

test.describe("Comedians (production content)", () => {
  test("COM-01 comedians list shows 4 cards with image, name and bio excerpt", { tag: ["@p1", "@prod-content"] }, async ({ page }) => {
    const comedians = new ComediansPage(page);
    await comedians.goto();
    await expect(comedians.cards).toHaveCount(4);
    for (const card of await comedians.cards.all()) {
      await expect(card.getByRole("img")).toHaveCount(1);
      await expect(comedians.cardLink(card)).toHaveText(/\S/);
      await expect(card.getByRole("paragraph").last()).toHaveText(/\w{3,}/);
    }
  });

  test(
    "COM-01 cards show no stray placeholder text",
    {
      tag: ["@p1", "@prod-content"],
      annotation: { type: "defect", description: "KNOWN: stray text \"nyeeee\" appears on Roydel's card (and leads his profile and meta description)." },
    },
    async ({ page }) => {
      test.fail();
      const comedians = new ComediansPage(page);
      await comedians.goto();
      await expect(comedians.card("Roydel")).toBeVisible();
      await expect(comedians.main).not.toContainText(/nyeee+/i);
    },
  );

  test("COM-04 profile images load from Supabase storage with alt text", { tag: ["@p2", "@prod-content"] }, async ({ page }) => {
    const comedians = new ComediansPage(page);
    await comedians.goto();
    const profiles = await comedians.cards
      .getByRole("heading", { level: 2 })
      .getByRole("link")
      .evaluateAll((els) => els.map((el) => el.getAttribute("href")!));

    for (const path of ["/comedians", ...profiles]) {
      await test.step(path, async () => {
        await page.goto(path);
        const images = comedians.main.getByRole("img");
        expect(await images.count(), "no images found").toBeGreaterThan(0);
        for (const img of await images.all()) {
          await img.scrollIntoViewIfNeeded();
          await expect(img).toHaveAccessibleName(/\S/);
          await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
          const src = decodeURIComponent((await img.evaluate((el: HTMLImageElement) => el.currentSrc || el.src)) ?? "");
          expect(src).toMatch(/\.supabase\.co\/storage\/v1\/object\/public\//);
        }
      });
    }
  });
});
