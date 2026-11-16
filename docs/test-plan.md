# ComedyOragon E2E Test Plan

Nov 17, 2026 · @Jay

## Scope and objectives

The suite proves that a visitor can find the group, browse comedians and shows, and send a booking request to the site's booking API — without ever creating a fake lead in production.

**In scope**

- Public pages: Home, About, Comedians (list + 4 profiles), Shows, Contact, Book
- Booking request form: validation, honeypot, submission, success and error states
- Navigation, header and footer links, the "Ask us" element, external Facebook link
- Responsive layout (desktop + mobile), accessibility basics, SEO metadata
- The request the booking form sends to the Next.js booking API route (payload shape)

**Out of scope (this phase)**

- Ticket Sync and the ticketing system (no ticket purchase flow exists on the site today)
- The n8n workflows behind the booking API
- Chatbot conversations (only opening and closing it is tested)
- Load and security testing

**Why both frameworks:** the same priority-1 scenarios are written in Playwright and Cypress so the repo doubles as a side-by-side comparison for interviews. Playwright carries the extended suite (cross-browser, mobile, accessibility, metadata).

## System under test

The suites drive the public Next.js site, which reads content from Supabase and sends booking requests to its own API route.

&#91;embedded content: system under test · 3 parts, 1 stub point\]

Booking tests call the real API route. The accent bar marks where BK-08 and BK-11 stub it to force an error or a dropped connection.

## Test approach

Booking tests call the real booking API on local and CI builds, and it doesn't matter whether those requests reach n8n; the API is only stubbed to force failures (BK-08, BK-11), and production stays read-only.

**Framework split**

|  | Playwright | Cypress |
| --- | --- | --- |
| Language | TypeScript | TypeScript |
| Scenarios | All P1 + P2 + P3 | All P1 (mirror of Playwright) |
| Browsers | Chromium, Firefox, WebKit | Chrome, Electron |
| Mobile | iPhone + Pixel emulation | Viewport presets only |
| Extras | axe-core accessibility, metadata checks | — |
| Network control | `page.route()` | `cy.intercept()` |
| Pattern | Page Object Model | Page Object Model (same page names) |

**Environments**

| Environment | Target | What runs | Booking submit |
| --- | --- | --- | --- |
| Local | `localhost:3000 (npm run dev) + comedyoragon Docker stack with local Postgres and sample data` | Everything | Real API call; stubbed only for BK-08 and BK-11 |
| CI | Vercel/preview build of each PR | Everything | Real API call; stubbed only for BK-08 and BK-11 |
| Production | comedyoragon.com | Read-only smoke: pages load, links, no submit | Never submitted |

**Test data**

- Comedians and shows are read from Supabase; tests assert structure (cards, links, past/upcoming states), not exact bios, so content edits don't break them.
- Booking data comes from fixtures (`booking.valid.json`, `booking.invalid.json`) with names like `QA Test – do not contact`.
- Dates are generated relative to today so date checks never go stale.

**Selectors:** prefer roles and labels (`getByRole`, `getByLabel`). Add `data-testid` only where no accessible name exists; this doubles as an accessibility check.

## Test scenarios

33 scenarios across 10 areas. The 13 P1 scenarios that run in both frameworks gate every merge; the 2 P1 smoke checks run on a schedule against production. PW = Playwright, CY = Cypress.

| ID | Area | Scenario | Expected result | Priority | Runs in |
| --- | --- | --- | --- | --- | --- |
| NAV-01 | Navigation | Home page loads | Title contains "ComedyOragon"; hero CTAs Book ComedyOragon, See Upcoming Shows, Meet the Comedians visible | P1 | PW, CY |
| NAV-02 | Navigation | Header links | Home, About, Comedians, Shows, Contact each open the right route with the right H1 | P1 | PW, CY |
| NAV-03 | Navigation | Book Us button | Opens /book from every page | P1 | PW, CY |
| NAV-04 | Navigation | Mobile menu (390 px) | Menu opens, links work, menu closes after navigation | P1 | PW, CY |
| NAV-05 | Navigation | Footer | Links match header; copyright shows the current year | P2 | PW |
| NAV-06 | Navigation | Skip to content | Keyboard Tab then Enter moves focus to #content | P2 | PW |
| NAV-07 | Navigation | Facebook link | Opens facebook.com/bicolstandup in a new tab with rel=noopener | P2 | PW |
| NAV-08 | Navigation | Unknown route | /does-not-exist shows a 404 page with a link home | P2 | PW |
| COM-01 | Comedians | Comedians list | 4 cards, each with image, name and bio excerpt | P1 | PW, CY |
| COM-02 | Comedians | Open a profile | Each card opens /comedians/{name}; H1 matches the card name | P1 | PW, CY |
| COM-03 | Comedians | Profile links | All comedians returns to the list; Book ComedyOragon opens /book | P2 | PW |
| COM-04 | Comedians | Profile images | Images load from Supabase storage, no broken images, alt text present | P2 | PW |
| SHW-01 | Shows | No upcoming shows | Shows "No shows scheduled right now" and a Request a Booking button | P1 | PW, CY |
| SHW-02 | Shows | Upcoming show (seeded) | Card shows title, date, time in PHT and venue | P1 | PW, CY |
| SHW-03 | Shows | Past shows | Labelled "Past show", newest first, no ticket button | P2 | PW |
| BK-01 | Booking | Submit empty form | Errors on Type of event, Date, Start time, Venue or city, Your name, Email; no API call sent | P1 | PW, CY |
| BK-02 | Booking | Invalid email | Email error shown; no API call sent | P1 | PW, CY |
| BK-03 | Booking | Valid minimum request | One call to the booking API with the required fields; form is replaced by a panel headed "Booking request received" that says it is not yet a confirmation and shows the submitted email; See Upcoming Shows opens /shows and Back to home opens / | P1 | PW, CY |
| BK-04 | Booking | All fields filled | API payload maps every field, including optional ones | P2 | PW |
| BK-05 | Booking | Event runs past midnight | End time earlier than start time is accepted | P2 | PW |
| BK-06 | Booking | Date in the past | Date picker disables past dates; a typed past date is rejected | P2 | PW |
| BK-07 | Booking | Honeypot filled | API rejects or ignores the request | P1 | PW, CY |
| BK-08 | Booking | API error (stub 500) | Red banner above the form: "Something went wrong sending your request. Please try again."; submit button resets; all entered data stays in the fields | P1 | PW, CY |
| BK-09 | Booking | Double-click submit | Exactly one API call sent | P2 | PW |
| BK-10 | Booking | Keyboard only | Form can be completed and submitted without a mouse | P2 | PW |
| BK-11 | Booking | Network drops on submit (aborted request) | Today: whole page switches to "Something went wrong backstage". Desired: same banner as BK-08 with entered data kept | P2 | PW |
| ASK-01 | Ask us | Ask us button | Opens the chatbot panel; the panel closes and the page stays usable | P3 | PW |
| A11Y-01 | Accessibility | axe scan, every page | No critical or serious violations | P2 | PW |
| RESP-01 | Responsive | 390 px width, every page | No horizontal scroll; CTAs reachable | P2 | PW |
| SEO-01 | Metadata | Every page | Title, full meta description, canonical URL, Open Graph tags | P3 | PW |
| SEO-02 | Content | Profile background section | Rendered as a heading plus a list | P3 | PW |
| SMK-01 | Production smoke | All public pages | Status 200, no console errors, no booking submitted | P1 | PW (scheduled) |
| SMK-02 | Production smoke | Book page renders | Form and Send Booking Request button visible | P1 | PW (scheduled) |

## Repo layout, CI and reporting

Each framework has its own repo, with matching page object names and fixtures so every P1 scenario reads the same in Playwright and Cypress.

```
comedyoragon-playwright-e2e/        (local folder: comedyoragon_playwright_dev)
├── README.md
├── playwright.config.ts
├── docs/test-plan.md
├── fixtures/                         # booking.valid.json, booking.invalid.json
├── pages/                            # HomePage, ComediansPage, ShowsPage, BookingPage
└── tests/                            # navigation, comedians, shows, booking, a11y, seo, smoke

comedyoragon-cypress-e2e/           (local folder: comedyoragon_cypress_dev)
├── README.md
├── cypress.config.ts
├── docs/test-plan.md
└── cypress/
    ├── fixtures/                     # same booking fixtures
    ├── pages/                        # same page objects
    └── e2e/                          # P1 mirror
```

**CI (GitHub Actions)**

| Workflow | Trigger | Runs | Blocks merge |
| --- | --- | --- | --- |
| e2e-pr | Every pull request | Playwright full suite (3 browsers + mobile) and Cypress P1 in parallel | Yes, on any P1 failure |
| smoke-prod | Daily + after each deploy | SMK-01, SMK-02 against production | No; sends an alert |

**Reporting:** Playwright HTML report and traces on failure; Cypress screenshots and videos on failure; both uploaded as CI artifacts. Retries: 1 in CI, 0 locally, so a flaky test shows up instead of hiding.

**Future: Jenkins.** A Jenkinsfile in each repo will run its suite on the existing jenkins-node Docker container, with the same stages as the GitHub Actions workflows (install, start the app and database, run tests, publish reports). GitHub Actions stays the first target until then.

## Entry/exit criteria, risks and open questions

**Entry criteria**

- The comedyoragon Docker stack (postgres-1 on port 5432) is running before npm run dev or any test run
- Local database is migrated and seeded (npx prisma migrate dev, npx prisma db seed)
- A seed script can create one upcoming show (needed for SHW-02)

**Exit criteria**

- All P1 scenarios pass in both frameworks on Chromium, and Playwright P1 passes on Firefox and WebKit
- No open P1 defects; P2 defects logged with severity
- No test booking created on production

**Risks**

| Risk | Impact | Mitigation |
| --- | --- | --- |
| A test submits a real booking to production | Fake lead and alert to the group | Production runs are read-only; local and CI test bookings use the name "QA Test" and a +test email so they are easy to spot and delete |
| Supabase content changes | Brittle assertions break | Assert structure and counts, not bio text |
| No upcoming shows in real data | SHW-02 can't run | Seed a show locally; stub the data in CI |
| Spam protection blocks automated submits | False failures | Honeypot stays empty in tests; add a short wait between submits if the API rate-limits |

**Known issues spotted during review** (log as defects once confirmed)

- Profile "Comedy Background & Performances" isn't a heading and its bullets run together on one line (SEO-02)
- Meta and social descriptions are cut off with an ellipsis (SEO-01)
- Stray text "nyeeee" appears on Roydel's card on the Comedians page
- A dropped connection on submit replaces the whole page with "Something went wrong backstage", so the visitor loses what they typed (BK-11; confirm on the local build)

**Decisions**

- The booking form posts to a Next.js API route; the n8n workflows behind it are out of scope
- Test bookings from local and CI builds may reach n8n; that is acceptable
- Past dates can't be selected in the date picker (BK-06)
- Ask us opens the chatbot (ASK-01)

**Open questions**

- [ ] None open. All questions are answered under Decisions and in the scenario table.
