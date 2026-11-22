import type { Notification } from "@/lib/notifications/types";
import { DAY_MS } from "@/lib/time";
import type { Month } from "./types";

export const CAREER_LOG_ROUTE = "/dashboard/career-log";
export const CHECKIN_ROUTE = `${CAREER_LOG_ROUTE}/check-in`;
export const MONTH_PARAM = "month";

export function checkinPath(month?: Month | null): string {
  return month ? `${CHECKIN_ROUTE}?${MONTH_PARAM}=${month}` : CHECKIN_ROUTE;
}

// The studio opens its "From your career log" review with this.
export const STUDIO_LOG_PARAM = "log";

// The month a check-in note in the bell asks about, from its link.
export function monthOfCheckinLink(link: string | null): string | null {
  if (!link?.startsWith(`${CHECKIN_ROUTE}?`)) return null;
  const month = new URLSearchParams(link.slice(CHECKIN_ROUTE.length + 1)).get(MONTH_PARAM);
  return month && /^\d{4}-(0[1-9]|1[0-2])$/.test(month) ? month : null;
}

// Home's card stays this long after the check-in rings, unless the month is written first.
const HOME_CARD_FOR_MS = 14 * DAY_MS;

// The month Home's check-in card asks about, from the bell's notes; null when there's no card.
export function homeCheckinMonth(items: readonly Notification[], now: number): string | null {
  const note = items.find(
    (item) => item.kind === "career_checkin" && now - item.createdAt < HOME_CARD_FOR_MS,
  );
  return note ? monthOfCheckinLink(note.link) : null;
}
