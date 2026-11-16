import { ShowsPage } from "../pages/ShowsPage";
import { formatShortDate, formatTimeRange } from "../helpers/dates";
import {
  acquireShowsLock,
  countUpcomingShows,
  deleteTestShows,
  hasLocalDatabase,
  insertTestShow,
  showStartTimes,
  type TestShow,
} from "../helpers/db";
import { expect, isProduction, test } from "../helpers/test";

/*
 * SHW-01 and SHW-02 change the local database, so they run serially and hold a
 * Postgres advisory lock: no other worker or browser project sees the seeded show.
 */
test.describe("Shows: seeded data", () => {
  test.describe.configure({ mode: "serial" });

  let lock: { release: () => Promise<void> } | undefined;

  test.beforeAll(async ({ baseURL }) => {
    test.skip(isProduction(baseURL) || !hasLocalDatabase(), "Needs the local database (DATABASE_URL in .env).");
    test.setTimeout(180_000); // may wait for other projects to release the lock
    lock = await acquireShowsLock();
    await deleteTestShows();
  });

  test.afterAll(async () => {
    if (!lock) return;
    try {
      await deleteTestShows();
    } finally {
      await lock.release();
    }
  });

  test("SHW-01 no upcoming shows shows the empty state and Request a Booking", { tag: "@p1" }, async ({ page }) => {
    const existing = await countUpcomingShows();
    test.skip(existing > 0, `The local DB has ${existing} upcoming show(s) not created by tests; SHW-01 needs none.`);

    const shows = new ShowsPage(page);
    await shows.goto();
    await expect(shows.upcomingCards).toHaveCount(0);
    await expect(shows.noShowsMessage).toBeVisible();
    await expect(shows.requestBookingLink).toBeVisible();
    await shows.requestBookingLink.click();
    await expect.poll(() => new URL(page.url()).pathname).toBe("/book");
  });

  test("SHW-02 seeded upcoming show card shows title, date, PHT time and venue", { tag: "@p1" }, async ({ page }) => {
    let show: TestShow;
    await test.step("insert a show 7 days from today", async () => {
      show = await insertTestShow(7);
    });

    const shows = new ShowsPage(page);
    await shows.goto();
    const card = shows.upcoming.getByRole("article").filter({ has: page.getByRole("heading", { name: show!.title }) });
    await expect(card).toHaveCount(1);
    await expect(card.getByRole("heading", { name: show!.title })).toBeVisible();
    await expect(card).toContainText(`${formatShortDate(show!.startsAt)} · ${formatTimeRange(show!.startsAt, show!.endsAt)}`);
    await expect(card).toContainText(show!.venueName);
    await expect(shows.noShowsMessage).toHaveCount(0);
  });
});

test.describe("Shows", () => {
  test("SHW-03 past shows are labelled, newest first, with no ticket button", { tag: "@p2" }, async ({ page }) => {
    const shows = new ShowsPage(page);
    await shows.goto();
    const count = await shows.recentCards.count();
    test.skip(count === 0, "No past shows in this environment's data.");

    const slugs: string[] = [];
    for (const card of await shows.recentCards.all()) {
      await expect(card.getByText("Past show", { exact: true })).toBeVisible();
      await expect(card.getByRole("link", { name: /ticket/i })).toHaveCount(0);
      await expect(card.getByRole("button", { name: /ticket/i })).toHaveCount(0);
      const href = await card.getByRole("heading").getByRole("link").getAttribute("href");
      slugs.push(href!.replace("/shows/", ""));
    }
    await expect(shows.recent.getByRole("link", { name: /ticket/i })).toHaveCount(0);

    if (hasLocalDatabase()) {
      // Card dates have no year, so take each show's real start time from the DB.
      const starts = await showStartTimes(slugs);
      const times = slugs.map((slug) => starts.get(slug)!.getTime());
      expect(times).toEqual([...times].sort((a, b) => b - a));
    } else {
      test.info().annotations.push({ type: "note", description: "Order not verified: needs the local DB for show years." });
    }
  });
});
