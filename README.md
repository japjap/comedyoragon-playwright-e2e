# ComedyOragon Playwright E2E

End-to-end tests for the [ComedyOragon](https://comedyoragon.com) website, written with [Playwright](https://playwright.dev) and TypeScript.

This repo only holds tests. The app lives in a separate repo (`../comedyoragon`). The full test plan, with all 33 scenarios, is in [docs/test-plan.md](docs/test-plan.md). A Cypress suite mirrors the P1 scenarios in a sibling repo, so the two frameworks can be compared side by side.

## Project layout

```
├── playwright.config.ts   # projects, baseURL, retries, reporters
├── docs/test-plan.md      # scope, scenarios (NAV-01, BK-03, ...), environments
├── fixtures/              # booking.valid.json, booking.invalid.json ("QA Test" data)
├── helpers/
│   ├── test.ts            # shared `test` with the production read-only guard
│   ├── db.ts              # LOCAL Postgres helper (show seeding, booking checks)
│   ├── booking.ts         # booking request tracking/parsing, free dates, test IPs
│   └── dates.ts           # Asia/Manila date helpers
├── pages/                 # page objects: HomePage, ComediansPage, ShowsPage, BookingPage, SiteLayout
└── tests/                 # one spec per area: navigation, comedians, shows, booking,
                           # ask-us, accessibility, responsive, seo, smoke
```

Page objects use role and label selectors (`getByRole`, `getByLabel`), never CSS classes. The only other selectors are `#content` (the skip-link target the plan names) and `<meta>`/`<link>` tags in the SEO spec, which have no role.

Every test title starts with its scenario ID (e.g. `BK-03 valid minimum request`), and every test is tagged by priority: `@p1`, `@p2` or `@p3`. SMK-01/02 are also tagged `@smoke`. Checks that need production content are tagged `@prod-content`.

## Projects

| Project | Target | What runs |
| --- | --- | --- |
| `chromium`, `firefox`, `webkit`, `iPhone 13`, `Pixel 7` | `BASE_URL` (default `http://localhost:3000`) | Everything except smoke and `@prod-content` |
| `prod-smoke` | `https://comedyoragon.com` | SMK-01, SMK-02 (read-only) |
| `prod-content` | `https://comedyoragon.com` | Content checks the local seed data can't cover: COM-01, COM-04, NAV-07, and the known content defects ("nyeeee", SEO-01 truncation, SEO-02) |

**Production is read-only.** The prod projects only load pages: they never fill or submit the booking form. As a second safeguard, `helpers/test.ts` aborts every request to comedyoragon.com other than GET/HEAD/OPTIONS, and fails the test if a form submission was attempted. Booking specs also skip themselves whenever the base URL is production.

## Prerequisites

- Node.js 20 or newer
- The ComedyOragon app running locally, on a **migrated and seeded** database:
  1. Start the comedyoragon Docker stack (Postgres on port 5432). From the app folder:
     ```sh
     cd ../comedyoragon
     docker compose up -d
     ```
  2. Bring the database and the Prisma client up to date. Re-run this after pulling app changes: a stale client or a missing migration makes every booking fail with "Something went wrong sending your request".
     ```sh
     npx prisma migrate deploy   # or: npx prisma migrate dev
     npx prisma generate
     npx prisma db seed          # first time only
     ```
  3. Start the dev server and leave it running:
     ```sh
     npm run dev
     ```
     The site should now load at http://localhost:3000.

### Local database access (`DATABASE_URL`)

SHW-01 and SHW-02 need control over which shows exist, and shows are rendered server-side, so `helpers/db.ts` writes directly to the **local** Postgres. It:

- reads `DATABASE_URL` from this repo's `.env`;
- **refuses to run unless the host is `localhost` or `127.0.0.1`**;
- inserts a published test show 7 days from today (slug `qa-e2e-show-…`) and deletes it afterwards;
- holds a Postgres advisory lock, so SHW-01/02 never overlap across workers or browser projects.

Booking tests also use it: to pick a date with no conflicting booking (pending bookings block their slot), and for BK-07, to check that a honeypot request stored nothing.

Without `DATABASE_URL`, SHW-01/02 are skipped and the booking tests use random future dates.

## Install

```sh
npm install
npx playwright install
cp .env.example .env    # then set DATABASE_URL to the local Docker Postgres
```

## Run the tests

| Command | What it does |
| --- | --- |
| `npm test` | Full local suite on chromium, firefox, webkit, iPhone 13 and Pixel 7 |
| `npm run test:chromium` | Full local suite on Chromium only |
| `npm run test:p1` | Only `@p1` scenarios, on all five local projects |
| `npm run test:smoke` | Production smoke (SMK-01, SMK-02) against comedyoragon.com, read-only |
| `npm run test:prod-content` | Production content checks against comedyoragon.com, read-only |
| `npm run test:headed` | Chromium with a visible browser |
| `npx playwright test -g "BK-03"` | One scenario by ID (add `--project=chromium`) |
| `npm run report` | Open the last HTML report |
| `npm run typecheck` | Type-check the project |

Retries are 0 locally and 1 when `CI` is set. Screenshots are saved on failure, and a trace is recorded on the first retry.

## Known defects

Tests for known defects assert the **correct** behaviour and are marked with `test.fail()`, plus an annotation `{ type: "defect", description }`. The suite stays green while a defect exists. If a defect gets fixed, its test passes unexpectedly and is reported as a failure, as a reminder to remove the `test.fail()`. The HTML report lists each defect's description.

## How the booking tests work

- The form submits through a Next.js **Server Action**: a `POST /book` with a `Next-Action` header and multipart fields prefixed `_1_`. `helpers/booking.ts` uses `page.on('request')` to count these "booking API calls", and parses them to check the payload (BK-03, BK-04).
- They call the real local booking action, which may reach n8n. Only BK-08 (stubbed HTTP 500) and BK-11 (aborted request) stub it, via `page.route`.
- The app allows 5 booking requests per client IP per hour. Each booking test sends its own `x-real-ip` from the 198.18.0.0/15 benchmarking range, so tests don't share a rate-limit bucket. This only works against local/CI builds.
- All test bookings use the name `QA Test` and `qa+test@example.com`, so they are easy to spot and delete.

## Safety rules

- Never submit the booking form on comedyoragon.com.
- Never commit `.env` files or secrets.
