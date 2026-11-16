import type { Locator } from "@playwright/test";

import validFixtures from "../fixtures/booking.valid.json";
import invalidFixtures from "../fixtures/booking.invalid.json";
import { BookingPage, type BookingData } from "../pages/BookingPage";
import {
  bookingPayload,
  EVENT_TYPE_KEYS,
  routeBookingSubmissions,
  trackBookingSubmissions,
  useUniqueClientIp,
  withFreeDate,
} from "../helpers/booking";
import { manilaDate, manilaInstant } from "../helpers/dates";
import { countBookings, hasLocalDatabase } from "../helpers/db";
import { expect, skipOnProduction, test } from "../helpers/test";

const valid = validFixtures as Record<string, BookingData>;
const invalid = invalidFixtures as Record<string, BookingData>;

/** What the form must send for the given data (empty strings for blank optional fields). */
function expectedPayload(data: BookingData) {
  return {
    eventType: EVENT_TYPE_KEYS[data.eventType!],
    date: data.date,
    startTime: data.startTime,
    endTime: data.endTime ?? "",
    venueName: data.venueName,
    venueAddress: data.venueAddress ?? "",
    guestCount: data.guestCount ?? "",
    notes: data.notes ?? "",
    contactName: data.contactName,
    contactEmail: data.contactEmail,
    contactPhone: data.contactPhone ?? "",
    company_url: "", // honeypot stays empty
  };
}

test.describe("Booking", () => {
  let booking: BookingPage;

  test.beforeEach(async ({ page, baseURL }) => {
    skipOnProduction(baseURL);
    await useUniqueClientIp(page);
    booking = new BookingPage(page);
    await booking.goto();
    await expect(booking.heading).toBeVisible();
  });

  test("BK-01 empty form shows required-field errors and sends nothing", { tag: "@p1" }, async ({ page }) => {
    const submissions = trackBookingSubmissions(page);
    await booking.submit();

    await expect(booking.formAlert).toContainText("Please fix the highlighted fields.");
    const required = [
      [booking.eventType, "Choose the type of event."],
      [booking.date, "Choose a date."],
      [booking.startTime, "Choose a start time."],
      [booking.venueName, "Enter the venue or city."],
      [booking.contactName, "Enter your name."],
      [booking.contactEmail, "Enter your email address."],
    ] as const;
    for (const [field, message] of required) {
      await expect(field).toHaveAttribute("aria-invalid", "true");
      await expect(field).toHaveAccessibleDescription(message);
    }
    for (const optional of [booking.endTime, booking.venueAddress, booking.guestCount, booking.notes, booking.contactPhone]) {
      await expect(optional).not.toHaveAttribute("aria-invalid", "true");
    }
    expect(submissions).toHaveLength(0);
  });

  test("BK-02 invalid email shows an email error and sends nothing", { tag: "@p1" }, async ({ page }) => {
    const submissions = trackBookingSubmissions(page);
    await booking.fill(invalid.invalidEmail);
    await booking.submit();

    await expect(booking.contactEmail).toHaveAttribute("aria-invalid", "true");
    await expect(booking.contactEmail).toHaveAccessibleDescription("Enter a valid email address.");
    await expect(booking.contactName).not.toHaveAttribute("aria-invalid", "true");
    expect(submissions).toHaveLength(0);
  });

  test("BK-03 valid minimum request", { tag: "@p1" }, async ({ page }) => {
    const data = await withFreeDate(valid.minimum);
    const submissions = trackBookingSubmissions(page);
    await booking.fill(data);
    await booking.submit();

    await expect(booking.successHeading).toBeVisible();
    await expect(booking.successHeading).toBeFocused();
    const main = page.getByRole("main");
    await expect(main).toContainText("not yet a confirmation");
    await expect(main).toContainText(data.contactEmail!);
    await expect(booking.submitButton).toHaveCount(0); // the form is replaced
    expect(submissions).toHaveLength(1);
    expect(bookingPayload(submissions[0])).toEqual(expectedPayload(data));

    await booking.seeUpcomingShowsLink.click();
    await expect.poll(() => new URL(page.url()).pathname).toBe("/shows");

    await test.step("Back to home (same request again: the app treats it as a duplicate)", async () => {
      await booking.goto();
      await booking.fill(data);
      await booking.submit();
      await expect(booking.successHeading).toBeVisible();
      await booking.backToHomeLink.click();
      await expect.poll(() => new URL(page.url()).pathname).toBe("/");
    });
  });

  test("BK-04 all fields are mapped into the request payload", { tag: "@p2" }, async ({ page }) => {
    const data = await withFreeDate(valid.full);
    const submissions = trackBookingSubmissions(page);
    await booking.fill(data);
    await booking.submit();

    await expect(booking.successHeading).toBeVisible();
    expect(submissions).toHaveLength(1);
    expect(bookingPayload(submissions[0])).toEqual(expectedPayload(data));
  });

  test("BK-05 end time before start time (past midnight) is accepted", { tag: "@p2" }, async ({ page }) => {
    const data = await withFreeDate(valid.pastMidnight);
    const submissions = trackBookingSubmissions(page);
    await booking.fill(data);
    await booking.submit();

    await expect(booking.successHeading).toBeVisible();
    expect(submissions).toHaveLength(1);
    expect(bookingPayload(submissions[0])).toMatchObject({ startTime: "22:00", endTime: "01:00" });
  });

  test("BK-06 past dates are disabled and a typed past date is rejected", { tag: "@p2" }, async ({ page }) => {
    await expect(booking.date).toHaveAttribute("min", manilaDate(0));

    const submissions = trackBookingSubmissions(page);
    await booking.fill(invalid.pastDate);
    await booking.submit();
    await expect(booking.date).toHaveAttribute("aria-invalid", "true");
    await expect(booking.date).toHaveAccessibleDescription("Choose a date in the future.");
    expect(submissions).toHaveLength(0);
  });

  test("BK-07 filled honeypot is ignored and nothing is stored", { tag: "@p1" }, async ({ page }) => {
    const data = await withFreeDate(invalid.honeypot);
    const submissions = trackBookingSubmissions(page);
    await booking.fill(data);
    await booking.submit();

    // The app answers bots with a normal-looking success and drops the request.
    await expect(booking.successHeading).toBeVisible();
    expect(submissions).toHaveLength(1);
    expect(bookingPayload(submissions[0]).company_url).toBe(data.honeypotValue);

    if (hasLocalDatabase()) {
      expect(await countBookings(data.contactEmail!, manilaInstant(data.date, data.startTime))).toBe(0);
    } else {
      test.info().annotations.push({ type: "note", description: "Storage not verified: needs the local DB." });
    }
  });

  test(
    "BK-08 API error (500) shows a banner and keeps the entered data",
    {
      tag: "@p1",
      annotation: {
        type: "defect",
        description:
          "NEW: an HTTP 500 from the booking Server Action is not handled by the form; the whole page is replaced by the error boundary \"Something went wrong backstage\" and the visitor loses what they typed. The banner only appears for errors the action returns in its response (e.g. a database failure).",
      },
    },
    async ({ page }) => {
      test.fail();
      await routeBookingSubmissions(page, (route) => route.fulfill({ status: 500, body: "Internal Server Error" }));
      const data = await withFreeDate(valid.minimum);
      await booking.fill(data);
      await booking.submit();

      await expect(booking.errorBanner).toBeVisible();
      await expect(booking.submitButton).toHaveText("Send Booking Request");
      await expect(booking.submitButton).toBeEnabled();
      await expect(booking.contactName).toHaveValue(data.contactName!);
      await expect(booking.contactEmail).toHaveValue(data.contactEmail!);
      await expect(booking.venueName).toHaveValue(data.venueName!);
      await expect(booking.date).toHaveValue(data.date);
    },
  );

  test("BK-09 double-click on submit sends exactly one request", { tag: "@p2" }, async ({ page }) => {
    const data = await withFreeDate(valid.minimum);
    const submissions = trackBookingSubmissions(page);
    await booking.fill(data);
    await booking.submitButton.dblclick();

    await expect(booking.successHeading).toBeVisible();
    await page.waitForLoadState("networkidle"); // let any late second request show up
    expect(submissions).toHaveLength(1);
  });

  test("BK-10 form can be completed and submitted with the keyboard only", { tag: "@p2" }, async ({ page }) => {
    const data = await withFreeDate(valid.minimum);
    const submissions = trackBookingSubmissions(page);

    /**
     * Presses Tab until `target` has focus. maxPresses allows for native date/time
     * widgets, where Tab also steps through the segments (month, day, year...).
     * Skipping past the target fails, because focus never comes back to it.
     */
    const tabTo = async (target: Locator, maxPresses = 4) => {
      for (let i = 0; i < maxPresses && !(await target.evaluate((el) => el === document.activeElement)); i++) {
        await page.keyboard.press("Tab");
      }
      await expect(target).toBeFocused();
    };

    await tabTo(booking.eventType, 40); // from the top of the page
    await booking.eventType.press("ArrowDown"); // first real option: "Private party"
    await expect(booking.eventType).toHaveValue(EVENT_TYPE_KEYS[data.eventType!]);

    // Native date/time widgets take typed input in browser- and locale-specific
    // segments, so those two values are set on the focused field; focus moves by Tab only.
    await tabTo(booking.date);
    await booking.date.fill(data.date);
    await tabTo(booking.startTime);
    await booking.startTime.fill(data.startTime);

    const typed = [
      [booking.endTime, ""],
      [booking.venueName, data.venueName!],
      [booking.venueAddress, ""],
      [booking.guestCount, ""],
      [booking.notes, ""],
      [booking.contactName, data.contactName!],
      [booking.contactEmail, data.contactEmail!],
      [booking.contactPhone, ""],
    ] as const;
    for (const [field, value] of typed) {
      await tabTo(field);
      if (value) await page.keyboard.type(value);
    }

    // Past the privacy note's "contact page" link to the submit button, then Enter.
    await tabTo(booking.submitButton, 3);
    await page.keyboard.press("Enter");

    await expect(booking.successHeading).toBeVisible();
    expect(submissions).toHaveLength(1);
  });

  test(
    "BK-11 dropped connection on submit keeps the form and shows the banner",
    {
      tag: "@p2",
      annotation: {
        type: "defect",
        description:
          "KNOWN (confirmed on the local build): an aborted booking request replaces the whole page with \"Something went wrong backstage\"; the visitor loses what they typed. Desired: the BK-08 banner with the data kept.",
      },
    },
    async ({ page }) => {
      test.fail();
      await routeBookingSubmissions(page, (route) => route.abort("connectionreset"));
      const data = await withFreeDate(valid.minimum);
      await booking.fill(data);
      await booking.submit();

      await expect(booking.errorBanner).toBeVisible();
      await expect(page.getByRole("heading", { name: "Something went wrong backstage" })).toHaveCount(0);
      await expect(booking.contactName).toHaveValue(data.contactName!);
      await expect(booking.contactEmail).toHaveValue(data.contactEmail!);
    },
  );
});
