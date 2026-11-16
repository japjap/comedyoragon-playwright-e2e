/** Date helpers in the site's time zone (Asia/Manila), so tests agree with the app's "today". */

export const SITE_TIME_ZONE = "Asia/Manila";
const DAY_MS = 24 * 60 * 60 * 1000;

/** Manila calendar date (YYYY-MM-DD), offsetDays from today. */
export function manilaDate(offsetDays = 0): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SITE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(Date.now() + offsetDays * DAY_MS));
}

/** The instant for a Manila wall-clock date and time (Manila is UTC+8, no DST). */
export function manilaInstant(date: string, time: string): Date {
  return new Date(`${date}T${time}:00+08:00`);
}

/** Matches the app's formatShortDate, e.g. "Tue, Nov 24". */
export function formatShortDate(instant: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: SITE_TIME_ZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(instant);
}

/** Matches the app's formatTimeRange, e.g. "8:00 PM – 10:00 PM PHT". */
export function formatTimeRange(start: Date, end: Date | null): string {
  const time = (d: Date) =>
    new Intl.DateTimeFormat("en-US", { timeZone: SITE_TIME_ZONE, hour: "numeric", minute: "2-digit" }).format(d);
  return `${end ? `${time(start)} – ${time(end)}` : time(start)} PHT`;
}
