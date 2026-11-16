import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";

import { SiteLayout } from "../pages/SiteLayout";
import { comedianProfilePaths, expect, PUBLIC_PAGES, test } from "../helpers/test";

/**
 * Known violations, each tracked by its own failing test below. Only the exact
 * rule on the exact element is ignored; anything else on that element still fails.
 */
const KNOWN_VIOLATIONS = [
  { rule: "label-content-name-mismatch", element: 'aria-label="Open chat"' }, // A11Y-01 chat launcher
];

/** Critical and serious axe violations on the current page, summarised for the report. */
async function seriousViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
    .analyze();
  return results.violations
    .filter((v) => v.impact === "critical" || v.impact === "serious")
    .map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes
        .filter((n) => !KNOWN_VIOLATIONS.some((k) => k.rule === v.id && n.html.includes(k.element)))
        .map((n) => n.html.slice(0, 160)),
    }))
    .filter((v) => v.nodes.length > 0);
}

test.describe("Accessibility", () => {
  for (const path of PUBLIC_PAGES) {
    test(`A11Y-01 axe scan ${path} has no critical or serious violations`, { tag: "@p2" }, async ({ page }) => {
      await page.goto(path);
      expect(await seriousViolations(page)).toEqual([]);
    });
  }

  test("A11Y-01 axe scan comedian profiles have no critical or serious violations", { tag: "@p2" }, async ({ page }) => {
    for (const path of await comedianProfilePaths(page)) {
      await test.step(path, async () => {
        await page.goto(path);
        expect.soft(await seriousViolations(page), path).toEqual([]);
      });
    }
  });

  test.describe("chat launcher label", () => {
    // The visible "Ask us" text only shows from the sm breakpoint up.
    test.use({ viewport: { width: 1280, height: 800 } });

    test(
      "A11Y-01 chat launcher's accessible name includes its visible label",
      {
        tag: "@p2",
        annotation: {
          type: "defect",
          description:
            "NEW (axe label-content-name-mismatch, serious, WCAG 2.5.3): the chat launcher shows \"Ask us\" but its accessible name is \"Open chat\", so voice-control users saying \"click Ask us\" can't reach it. Found on every public page.",
        },
      },
      async ({ page }) => {
        test.fail();
        const layout = new SiteLayout(page);
        await page.goto("/");
        await expect(layout.chatLauncher.getByText("Ask us")).toBeVisible();
        await expect(layout.chatLauncher).toHaveAccessibleName(/Ask us/);
      },
    );
  });
});
