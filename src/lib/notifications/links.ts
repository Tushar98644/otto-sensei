import { applicationHref } from "@/lib/applications/thread";

export const WRITE_PARAM = "write";
export const WRITE_FOLLOW_UP = "follow-up";
export const WRITE_THANK_YOU = "thank-you";

// The application's page with the outreach writer open on a follow-up: the chip, the bell and the email link here.
export function followUpWritePath(id: string): string {
  return `${applicationHref(id)}?${WRITE_PARAM}=${WRITE_FOLLOW_UP}`;
}

export function interviewPrepPath(id: string): string {
  return `${applicationHref(id)}/prep?start=1`;
}

// The application's page with the outreach writer open on a thank-you after the interview.
export function thankYouWritePath(id: string): string {
  return `${applicationHref(id)}?${WRITE_PARAM}=${WRITE_THANK_YOU}`;
}
