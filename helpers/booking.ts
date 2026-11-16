import type { Page, Request, Route } from "@playwright/test";

import { findFreeBookingDate, hasLocalDatabase } from "./db";
import { manilaDate } from "./dates";
import type { BookingData } from "../pages/BookingPage";

/*
 * The booking form submits through a Next.js Server Action: a POST to /book
 * with a `Next-Action` header and a multipart body whose fields are prefixed
 * "_1_" (e.g. "_1_contactEmail"). That request is "the booking API call".
 */

export const EVENT_TYPE_KEYS: Record<string, string> = {
  "Private party": "PRIVATE_PARTY",
  "Corporate event": "CORPORATE",
  "School/University": "SCHOOL",
  Festival: "FESTIVAL",
  Wedding: "WEDDING",
  Other: "OTHER",
};

export function isBookingSubmission(request: Request): boolean {
  return (
    request.method() === "POST" &&
    new URL(request.url()).pathname === "/book" &&
    request.headers()["next-action"] !== undefined
  );
}

/** Collects every booking submission the page sends (page.on('request')). */
export function trackBookingSubmissions(page: Page): Request[] {
  const requests: Request[] = [];
  page.on("request", (request) => {
    if (isBookingSubmission(request)) requests.push(request);
  });
  return requests;
}

/** Form fields sent in a booking submission, without the "_1_" prefix. */
export function bookingPayload(request: Request): Record<string, string> {
  const contentType = request.headers()["content-type"] ?? "";
  const boundary = /boundary=(.+)$/.exec(contentType)?.[1];
  const body = request.postDataBuffer()?.toString("utf8") ?? "";
  if (!boundary) throw new Error(`Booking submission is not multipart: ${contentType}`);

  const fields: Record<string, string> = {};
  for (const part of body.split(`--${boundary}`)) {
    const match = /name="([^"]+)"\r?\n\r?\n([\s\S]*?)\r?\n$/.exec(part);
    if (!match) continue;
    const [, rawName, value] = match;
    const name = rawName.replace(/^_\d+_/, "");
    if (name === rawName) continue; // framework fields such as "0"
    fields[name] = value;
  }
  return fields;
}

/** Routes only booking submissions on this page to the handler; everything else passes through. */
export async function routeBookingSubmissions(page: Page, handler: (route: Route) => Promise<void>) {
  await page.route("**/book", async (route) => {
    if (isBookingSubmission(route.request())) return handler(route);
    return route.fallback();
  });
}

/**
 * The app rate-limits bookings per client IP (5 per hour), read from x-real-ip.
 * Each booking test sends its own address from the 198.18.0.0/15 benchmarking range
 * so tests never share a bucket. Only used against local/CI builds.
 */
export async function useUniqueClientIp(page: Page) {
  const octet = () => Math.floor(Math.random() * 254) + 1;
  await page.setExtraHTTPHeaders({ "x-real-ip": `198.18.${octet()}.${octet()}` });
}

/** Fixture data with a date that is free in the local DB (or a random future date without one). */
export async function withFreeDate(data: BookingData): Promise<BookingData & { date: string; startTime: string }> {
  const startTime = data.startTime ?? "19:00";
  const date = hasLocalDatabase()
    ? await findFreeBookingDate(startTime, data.endTime)
    : manilaDate(21 + Math.floor(Math.random() * 600));
  return { ...data, startTime, date };
}
