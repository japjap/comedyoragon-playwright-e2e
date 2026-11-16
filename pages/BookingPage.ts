import { type Locator, type Page } from "@playwright/test";

/** Shape of the entries in fixtures/booking.*.json. */
export interface BookingData {
  eventType?: string; // visible option label, e.g. "Private party"
  date?: string; // YYYY-MM-DD, or "+N" for N days from today
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
  readonly successHeading: Locator;
  readonly errorBanner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { level: 1, name: "Request a Booking" });
    this.eventType = page.getByLabel("Type of event");
    this.date = page.getByLabel("Date", { exact: true });
    this.startTime = page.getByLabel("Start time");
    this.endTime = page.getByLabel("End time");
    this.venueName = page.getByLabel("Venue or city");
    this.venueAddress = page.getByLabel("Venue address");
    this.guestCount = page.getByLabel("Expected guests");
    this.notes = page.getByLabel("Tell us about your event");
    this.contactName = page.getByLabel("Your name");
    this.contactEmail = page.getByLabel("Email");
    this.contactPhone = page.getByLabel("Phone");
    this.honeypot = page.getByLabel("Leave this field empty");
    this.submitButton = page.getByRole("button", { name: /Send Booking Request|Sending request/ });
    this.successHeading = page.getByRole("heading", { name: "Booking request received" });
    this.errorBanner = page.getByText("Something went wrong sending your request. Please try again.");
  }

  async goto() {
    await this.page.goto("/book");
  }

  /** Turns "+N" into the date N days from today (YYYY-MM-DD) so fixtures never go stale. */
  static resolveDate(value: string): string {
    const match = /^\+(\d+)$/.exec(value);
    if (!match) return value;
    const d = new Date();
    d.setDate(d.getDate() + Number(match[1]));
    return d.toISOString().slice(0, 10);
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
