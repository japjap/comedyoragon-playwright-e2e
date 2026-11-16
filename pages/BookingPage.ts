import { type Locator, type Page } from "@playwright/test";

import { manilaDate } from "../helpers/dates";

/** Shape of the entries in fixtures/booking.*.json. */
export interface BookingData {
  eventType?: string; // visible option label, e.g. "Private party"
  date?: string; // YYYY-MM-DD, or "+N" for N days from today (Manila)
  startTime?: string; // HH:MM
  endTime?: string;
  venueName?: string;
  venueAddress?: string;
  guestCount?: string;
  notes?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  honeypotValue?: string; // only for BK-07
}

/**
 * Labels render as "Date *" (asterisk hidden from assistive tech) or
 * "End time (optional)", so match the label text plus exactly those suffixes.
 */
const label = (text: string) => new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}( \\*| \\(optional\\))?$`);

export class BookingPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly eventType: Locator;
  readonly date: Locator;
  readonly startTime: Locator;
  readonly endTime: Locator;
  readonly venueName: Locator;
  readonly venueAddress: Locator;
  readonly guestCount: Locator;
  readonly notes: Locator;
  readonly contactName: Locator;
  readonly contactEmail: Locator;
  readonly contactPhone: Locator;
  readonly honeypot: Locator;
  readonly submitButton: Locator;
  readonly formAlert: Locator;
  readonly errorBanner: Locator;
  readonly successHeading: Locator;
  readonly seeUpcomingShowsLink: Locator;
  readonly backToHomeLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { level: 1, name: "Request a Booking" });
    this.eventType = page.getByLabel(label("Type of event"));
    this.date = page.getByLabel(label("Date"));
    this.startTime = page.getByLabel(label("Start time"));
    this.endTime = page.getByLabel(label("End time"));
    this.venueName = page.getByLabel(label("Venue or city"));
    this.venueAddress = page.getByLabel(label("Venue address"));
    this.guestCount = page.getByLabel(label("Expected guests"));
    this.notes = page.getByLabel(label("Tell us about your event"));
    this.contactName = page.getByLabel(label("Your name"));
    this.contactEmail = page.getByLabel(label("Email"));
    this.contactPhone = page.getByLabel(label("Phone"));
    this.honeypot = page.getByLabel("Leave this field empty");
    this.submitButton = page.getByRole("button", { name: /Send Booking Request|Sending request/ });
    this.formAlert = page.getByRole("main").getByRole("alert");
    this.errorBanner = this.formAlert.filter({
      hasText: "Something went wrong sending your request. Please try again.",
    });
    this.successHeading = page.getByRole("heading", { name: "Booking request received" });
    this.seeUpcomingShowsLink = page.getByRole("main").getByRole("link", { name: "See Upcoming Shows" });
    this.backToHomeLink = page.getByRole("main").getByRole("link", { name: "Back to home" });
  }

  async goto() {
    await this.page.goto("/book");
  }

  /** Turns "+N" into the Manila date N days from today (YYYY-MM-DD) so fixtures never go stale. */
  static resolveDate(value: string): string {
    const match = /^\+(\d+)$/.exec(value);
    return match ? manilaDate(Number(match[1])) : value;
  }

  async fill(data: BookingData) {
    if (data.eventType) await this.eventType.selectOption({ label: data.eventType });
    if (data.date) await this.date.fill(BookingPage.resolveDate(data.date));
    if (data.startTime) await this.startTime.fill(data.startTime);
    if (data.endTime) await this.endTime.fill(data.endTime);
    if (data.venueName) await this.venueName.fill(data.venueName);
    if (data.venueAddress) await this.venueAddress.fill(data.venueAddress);
    if (data.guestCount) await this.guestCount.fill(data.guestCount);
    if (data.notes) await this.notes.fill(data.notes);
    if (data.contactName) await this.contactName.fill(data.contactName);
    if (data.contactEmail) await this.contactEmail.fill(data.contactEmail);
    if (data.contactPhone) await this.contactPhone.fill(data.contactPhone);
    if (data.honeypotValue) await this.honeypot.fill(data.honeypotValue, { force: true });
  }

  async submit() {
    await this.submitButton.click();
  }
}
