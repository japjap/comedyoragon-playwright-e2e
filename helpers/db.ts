import { randomBytes } from "node:crypto";
import { Client } from "pg";
import "dotenv/config";

import { manilaDate, manilaInstant } from "./dates";

/*
 * Direct access to the LOCAL comedyoragon Postgres (the Docker stack), used to
 * seed shows for SHW-01/SHW-02 and to verify booking side effects.
 * It refuses to run unless DATABASE_URL points at localhost or 127.0.0.1.
 * Everything it creates is marked with the "qa-e2e-" prefix and removed again.
 */

const ALLOWED_HOSTS = new Set(["localhost", "127.0.0.1"]);
const TEST_SHOW_PREFIX = "qa-e2e-show-";
/** Serializes the show-seeding tests across workers and browser projects. */
const SHOWS_LOCK_KEY = 774_201;

/** True when DATABASE_URL is set. Throws if it is set to anything but a local database. */
export function hasLocalDatabase(): boolean {
  if (!process.env.DATABASE_URL) return false;
  localDatabaseUrl();
  return true;
}

export function localDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL is not set. Add it to .env (see .env.example); it must point at the local Docker Postgres.");
  }
  let host: string;
  try {
    host = new URL(raw).hostname;
  } catch {
    throw new Error("DATABASE_URL is not a valid URL.");
  }
  if (!ALLOWED_HOSTS.has(host)) {
    throw new Error(`Refusing to use the database on host "${host}": the test DB helper only runs against localhost or 127.0.0.1.`);
  }
  return raw;
}

async function withDb<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: localDatabaseUrl() });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

/** Holds a session-level advisory lock until release() is called. */
export async function acquireShowsLock(): Promise<{ release: () => Promise<void> }> {
  const client = new Client({ connectionString: localDatabaseUrl() });
  await client.connect();
  await client.query("SELECT pg_advisory_lock($1)", [SHOWS_LOCK_KEY]);
  return {
    release: async () => {
      try {
        await client.query("SELECT pg_advisory_unlock($1)", [SHOWS_LOCK_KEY]);
      } finally {
        await client.end();
      }
    },
  };
}

export type TestShow = { slug: string; title: string; venueName: string; startsAt: Date; endsAt: Date };

/** Inserts a published show, daysFromToday at 20:00–22:00 Manila time. */
export async function insertTestShow(daysFromToday: number): Promise<TestShow> {
  const token = randomBytes(4).toString("hex");
  const date = manilaDate(daysFromToday);
  const show: TestShow = {
    slug: `${TEST_SHOW_PREFIX}${token}`,
    title: `QA Test Show ${token}`,
    venueName: "QA Test Venue",
    startsAt: manilaInstant(date, "20:00"),
    endsAt: manilaInstant(date, "22:00"),
  };
  await withDb((db) =>
    db.query(
      `INSERT INTO shows (id, slug, title, description, starts_at, ends_at, time_zone, venue_name,
                          status, capacity, is_published, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'Asia/Manila', $7, 'SCHEDULED', 50, true, now())`,
      [
        `qa-e2e-${token}`,
        show.slug,
        show.title,
        "Automated E2E test show. Safe to delete.",
        show.startsAt,
        show.endsAt,
        show.venueName,
      ],
    ),
  );
  return show;
}

/** Removes every show created by these tests. */
export async function deleteTestShows(): Promise<void> {
  await withDb((db) => db.query("DELETE FROM shows WHERE slug LIKE $1", [`${TEST_SHOW_PREFIX}%`]));
}

/** Published shows the site lists as upcoming (same rule as getUpcomingShows). */
export async function countUpcomingShows(): Promise<number> {
  const { rows } = await withDb((db) =>
    db.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM shows WHERE is_published AND (starts_at >= now() OR ends_at >= now())",
    ),
  );
  return rows[0].n;
}

/** Start instants of shows by slug. */
export async function showStartTimes(slugs: string[]): Promise<Map<string, Date>> {
  const { rows } = await withDb((db) =>
    db.query<{ slug: string; starts_at: Date }>("SELECT slug, starts_at FROM shows WHERE slug = ANY($1)", [slugs]),
  );
  return new Map(rows.map((r) => [r.slug, r.starts_at]));
}

/**
 * A Manila date (YYYY-MM-DD) with no pending/confirmed booking or published show
 * near the requested times, so repeated runs never hit the app's conflict check.
 */
export async function findFreeBookingDate(startTime: string, endTime?: string): Promise<string> {
  for (let attempt = 0; attempt < 40; attempt++) {
    const date = manilaDate(21 + Math.floor(Math.random() * 600));
    const startsAt = manilaInstant(date, startTime);
    let endsAt = endTime ? manilaInstant(date, endTime) : new Date(startsAt.getTime() + 2 * 3600_000);
    if (endsAt <= startsAt) endsAt = new Date(endsAt.getTime() + 24 * 3600_000);
    // Anything starting within 13 h either side could overlap (max event length is 12 h).
    const from = new Date(startsAt.getTime() - 13 * 3600_000);
    const to = new Date(endsAt.getTime() + 13 * 3600_000);
    const { rows } = await withDb((db) =>
      db.query(
        `SELECT 1 FROM bookings WHERE status IN ('PENDING', 'CONFIRMED') AND starts_at BETWEEN $1 AND $2
         UNION ALL
         SELECT 1 FROM shows WHERE is_published AND status <> 'CANCELLED' AND starts_at BETWEEN $1 AND $2
         LIMIT 1`,
        [from, to],
      ),
    );
    if (rows.length === 0) return date;
  }
  throw new Error("Could not find a free booking date in the local database.");
}

/** Number of stored bookings for this email and start instant. */
export async function countBookings(contactEmail: string, startsAt: Date): Promise<number> {
  const { rows } = await withDb((db) =>
    db.query<{ n: number }>("SELECT count(*)::int AS n FROM bookings WHERE contact_email = $1 AND starts_at = $2", [
      contactEmail,
      startsAt,
    ]),
  );
  return rows[0].n;
}
