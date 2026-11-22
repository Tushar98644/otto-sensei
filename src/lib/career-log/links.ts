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
