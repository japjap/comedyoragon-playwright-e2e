import type { Page } from "@playwright/test";

import { comedianProfilePaths, expect, PUBLIC_PAGES, test } from "../helpers/test";

type Meta = Record<"description" | "canonical" | "ogTitle" | "ogDescription" | "ogUrl" | "ogType", string | null>;

async function readMeta(page: Page): Promise<Meta> {
  const content = async (selector: string, attribute = "content") =>
    (await page.locator(selector).count()) ? page.locator(selector).first().getAttribute(attribute) : null;
  return {
    description: await content('meta[name="description"]'),
    canonical: await content('link[rel="canonical"]', "href"),
    ogTitle: await content('meta[property="og:title"]'),
    ogDescription: await content('meta[property="og:description"]'),
    ogUrl: await content('meta[property="og:url"]'),
    ogType: await content('meta[property="og:type"]'),
  };
}

const TRUNCATED = /(…|\.\.\.)$/;

async function checkMetadata(page: Page, path: string) {
  await page.goto(path);
  await expect.soft(page, `${path}: title`).toHaveTitle(/ComedyOragon/);
  const meta = await readMeta(page);

  expect.soft(meta.description, `${path}: meta description`).toMatch(/\S{3,}/);
  expect.soft(meta.description ?? "", `${path}: meta description is cut off`).not.toMatch(TRUNCATED);
  expect.soft(meta.ogDescription ?? "", `${path}: og:description is cut off`).not.toMatch(TRUNCATED);

  // Canonical: absolute URL for this path (the host is whatever the site is configured with).
  const canonical = new URL(meta.canonical ?? "invalid:");
  expect.soft(canonical.protocol, `${path}: canonical is absolute`).toMatch(/^https?:$/);
  expect.soft(canonical.pathname.replace(/\/$/, "") || "/", `${path}: canonical path`).toBe(path);

  expect.soft(meta.ogTitle, `${path}: og:title`).toMatch(/\S/);
  expect.soft(meta.ogDescription, `${path}: og:description`).toBe(meta.description);
  expect.soft(meta.ogUrl, `${path}: og:url`).toBe(meta.canonical);
  expect.soft(meta.ogType, `${path}: og:type`).toMatch(/^(website|profile|article)$/);
}

test.describe("SEO", () => {
  for (const path of PUBLIC_PAGES) {
    test(`SEO-01 ${path} has title, full description, canonical and Open Graph tags`, { tag: "@p3" }, async ({ page }) => {
      await checkMetadata(page, path);
    });
  }

  test("SEO-01 comedian profiles have title, full description, canonical and Open Graph tags", { tag: "@p3" }, async ({ page }) => {
    for (const path of await comedianProfilePaths(page)) {
      await test.step(path, () => checkMetadata(page, path));
    }
  });
});

test.describe("SEO (production content)", () => {
  test(
    "SEO-01 profile descriptions are complete on production",
    {
      tag: ["@p3", "@prod-content"],
      annotation: { type: "defect", description: "KNOWN: profile meta and social descriptions are cut off with an ellipsis (e.g. /comedians/roydel)." },
    },
    async ({ page }) => {
      test.fail();
      for (const path of await comedianProfilePaths(page)) {
        await test.step(path, () => checkMetadata(page, path));
      }
    },
  );

  test(
    "SEO-02 profile background section is a heading plus a list",
    {
      tag: ["@p3", "@prod-content"],
      annotation: {
        type: "defect",
        description:
          "KNOWN: on /comedians/rc, \"Comedy Background & Performances\" is a plain paragraph and its bullets run together in one paragraph.",
      },
    },
    async ({ page }) => {
      test.fail();
      await page.goto("/comedians/rc");
      const article = page.getByRole("main").getByRole("article");
      await expect(article).toContainText("Comedy Background & Performances");
      await expect(article.getByRole("heading", { name: "Comedy Background & Performances" })).toBeVisible();
      await expect(article.getByRole("list").filter({ hasText: "Affiliation" }).getByRole("listitem")).toHaveCount(3);
    },
  );
});
