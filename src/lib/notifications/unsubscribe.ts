import { createHmac, timingSafeEqual } from "node:crypto";
import { cronSecret } from "@/lib/cron/auth";
import { appUrl } from "@/lib/env";
import { EMAIL_LISTS, type EmailList, type FollowUpAction } from "./types";

// RFC 8058 posts carry no session, so the signed link proves the account.

export const UNSUBSCRIBE_PATH = "/api/notifications/unsubscribe";

// A label in the signed text keeps these tokens from ever matching another use of the secret, or another list.
function sign(secret: string, userId: string, list: EmailList): Buffer {
  return createHmac("sha256", secret).update(`email-${list}:unsubscribe:v1:${userId}`).digest();
}

export function unsubscribeToken(userId: string, list: EmailList = "reminders"): string | null {
  const secret = cronSecret();
  return secret ? sign(secret, userId, list).toString("base64url") : null;
}

export function verifyUnsubscribeToken(
  userId: string,
  token: string,
  list: EmailList = "reminders",
): boolean {
  const secret = cronSecret();
  if (!secret || !/^[A-Za-z0-9_-]{43}$/.test(token)) return false;
  return timingSafeEqual(Buffer.from(token, "base64url"), sign(secret, userId, list));
}

export function isEmailList(value: string): value is EmailList {
  return (EMAIL_LISTS as readonly string[]).includes(value);
}

// Follow-up reminder links carry no list, as they did before there were others.
export function unsubscribeUrl(userId: string, list: EmailList = "reminders"): string | null {
  const token = unsubscribeToken(userId, list);
  if (!token) return null;
  const url = new URL(UNSUBSCRIBE_PATH, appUrl());
  url.searchParams.set("u", userId);
  url.searchParams.set("t", token);
  if (list !== "reminders") url.searchParams.set("l", list);
  return url.toString();
}

export function listUnsubscribeHeaders(url: string | null): Record<string, string> {
  return url
    ? { "List-Unsubscribe": `<${url}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" }
    : {};
}

export const EMAIL_ACTION_PATH = "/reminder";

function signAction(
  secret: string,
  userId: string,
  applicationId: string,
  action: FollowUpAction,
): Buffer {
  return createHmac("sha256", secret)
    .update(`follow-up:${action}:v1:${userId}:${applicationId}`)
    .digest();
}

export function verifyFollowUpToken(
  userId: string,
  applicationId: string,
  action: FollowUpAction,
  token: string,
): boolean {
  const secret = cronSecret();
  if (!secret || !/^[A-Za-z0-9_-]{43}$/.test(token)) return false;
  return timingSafeEqual(
    Buffer.from(token, "base64url"),
    signAction(secret, userId, applicationId, action),
  );
}

export function followUpActionUrl(
  userId: string,
  applicationId: string,
  action: FollowUpAction,
): string | null {
  const secret = cronSecret();
  if (!secret) return null;
  const url = new URL(EMAIL_ACTION_PATH, appUrl());
  url.searchParams.set("do", action);
  url.searchParams.set("u", userId);
  url.searchParams.set("a", applicationId);
  url.searchParams.set("t", signAction(secret, userId, applicationId, action).toString("base64url"));
  return url.toString();
}

export function unsubscribePageUrl(userId: string): string | null {
  const token = unsubscribeToken(userId);
  if (!token) return null;
  const url = new URL(EMAIL_ACTION_PATH, appUrl());
  url.searchParams.set("do", "unsubscribe");
  url.searchParams.set("u", userId);
  url.searchParams.set("t", token);
  return url.toString();
}
