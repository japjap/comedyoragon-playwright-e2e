# ComedyOragon Playwright E2E

End-to-end tests for the [ComedyOragon](https://comedyoragon.com) website, written with [Playwright](https://playwright.dev) and TypeScript.

This repo only holds tests. The app lives in a separate repo (`../comedyoragon`). The full test plan is in [docs/test-plan.md](docs/test-plan.md). A Cypress suite mirrors the P1 scenarios in a sibling repo, so the two frameworks can be compared side by side.

## Project layout

```
├── playwright.config.ts   # baseURL, browsers/devices, retries, reporters
├── docs/test-plan.md      # scope, scenarios (NAV-01, BK-03, ...), environments
├── fixtures/              # booking.valid.json, booking.invalid.json
├── pages/                 # page objects: HomePage, ComediansPage, ShowsPage, BookingPage
└── tests/                 # specs, one file per area
```

Page objects use role and label selectors only (`getByRole`, `getByLabel`), never CSS classes.

## Prerequisites

- Node.js 20 or newer
- The ComedyOragon app running locally:
  1. Start the comedyoragon Docker stack (Postgres on port 5432). From the app folder:
     ```sh
     cd ../comedyoragon
     docker compose up -d
     ```
  2. If the database is new, migrate and seed it:
     ```sh
     npx prisma migrate dev
     npx prisma db seed
     ```
  3. Start the dev server and leave it running:
     ```sh
     npm run dev
     ```
     The site should now load at http://localhost:3000.

## Install

```sh
npm install
npx playwright install
```

Optional: copy `.env.example` to `.env` to set `BASE_URL`. Without it, tests run against `http://localhost:3000`.

## Run the tests

| Command | What it does |
| --- | --- |
| `npm test` | All tests on every project (Chromium, Firefox, WebKit, iPhone 13, Pixel 7) |
| `npm run test:chromium` | All tests on Chromium only |
| `npm run test:headed` | Run with a visible browser |
| `npx playwright test tests/navigation.spec.ts` | One spec file |
| `npx playwright test -g "NAV-01"` | One scenario by ID |
| `npx playwright test --ui` | Interactive UI mode |
| `npm run report` | Open the last HTML report |
| `npm run typecheck` | Type-check the project |

Retries are 0 locally and 1 when `CI` is set. Screenshots are saved on failure, and a trace is recorded on the first retry.

## Safety rules

- **Production is read-only.** Never submit the booking form on comedyoragon.com. Only the read-only smoke checks (SMK-01, SMK-02) may target production.
- Test bookings on local and CI builds use the name `QA Test` and a `+test` email (`qa+test@example.com`), so they are easy to find and delete.
- Never commit `.env` files or secrets.
