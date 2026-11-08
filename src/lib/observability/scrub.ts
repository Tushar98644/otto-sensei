import type { Breadcrumb, ErrorEvent } from "@sentry/nextjs";

// Everything that leaves for Sentry passes through here first. Structure does most of the work
// (request bodies, cookies and most headers are dropped whole); the patterns below are a second
// net for an email, phone number or pasted resume that ends up inside an error message.

type Fields = Record<string, string | number | boolean | null | undefined>;

// "*" is allowed so maskEmail()'s "al***@example.com" goes too: the domain alone can name a person.
const EMAIL = /[\p{L}\p{N}._%+*-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+/gu;
const IPV4 = /(?<![\d.])(?:\d{1,3}\.){3}\d{1,3}(?![\d.])/g;
// Groups of digits with optional "+", parentheses, spaces, dots or dashes. Not glued to letters or
// dashes, so the digit runs inside ids and UUIDs stay readable.
const PHONE =
  /(?<![\w+-])(?:\+\d{1,3}[\s.-]?)?(?:\(\d{1,4}\)[\s.-]?)?\d{2,4}(?:[\s.-]?\d{2,4}){1,4}(?![\w-])/gu;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
// Share links are the key to someone's resume.
const SHARE_PATH = /(\/s\/)[^/?#\s"']+/g;
// Drizzle lists every bound value after "params:"; the statement before it has placeholders only.
const QUERY_PARAMS = /\nparams:[\s\S]*$/;

// Longer than this is pasted text (a resume, a job post), not a message a developer wrote.
const MAX_TEXT = 300;
const MAX_DEPTH = 6;

// Matched on the key with case and separators removed: "userEmail" and "user_email" both go.
const SENSITIVE_KEYS = new Set([
  "answer",
  "authorization",
  "body",
  "bullet",
  "bullets",
  "code",
  "content",
  "cookie",
  "cookies",
  "jobpost",
  "otp",
  "prompt",
  "resume",
  "session",
  "summary",
  "text",
]);
const SENSITIVE_SUFFIXES = ["email", "password", "phone", "secret", "text", "token"];

// The only request headers kept: enough to tell browsers apart and match a Vercel log line.
const KEPT_HEADERS = new Set([
  "accept",
  "content-length",
  "content-type",
  "user-agent",
  "x-vercel-id",
]);

function isSensitiveKey(key: string): boolean {
  const flat = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  return SENSITIVE_KEYS.has(flat) || SENSITIVE_SUFFIXES.some((suffix) => flat.endsWith(suffix));
}

function digitCount(value: string): number {
  return value.replace(/\D/g, "").length;
}

function maskPhone(match: string): string {
  if (ISO_DATE.test(match)) return match;
  const digits = digitCount(match);
  // A bare run of digits is a phone number only at full length; with separators, 7 is enough.
  const formatted = /^\+|[\s().-]/.test(match);
  if (digits > 15 || digits < (formatted ? 7 : 10)) return match;
  return "[phone]";
}

/** Masks emails, phone numbers, IP addresses and share links inside free text. */
export function scrubText(value: string): string {
  return value
    .replace(EMAIL, "[email]")
    .replace(IPV4, "[ip]")
    .replace(PHONE, maskPhone)
    .replace(SHARE_PATH, "$1[link]");
}

function scrubString(value: string): string {
  if (value.length > MAX_TEXT) return `[removed: ${value.length} characters]`;
  return scrubText(value);
}

/** An error message: database parameters cut, PII masked, and capped rather than dropped. */
export function scrubMessage(value: string): string {
  const masked = scrubText(value.replace(QUERY_PARAMS, ""));
  return masked.length > MAX_TEXT ? `${masked.slice(0, MAX_TEXT)}… [cut]` : masked;
}

function scrubValue(value: unknown, depth: number): unknown {
  if (typeof value === "string") return scrubString(value);
  if (value === null || typeof value !== "object") return value;
  if (depth >= MAX_DEPTH) return "[removed: nested too deep]";
  if (Array.isArray(value)) return value.map((item) => scrubValue(item, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    out[key] = isSensitiveKey(key) ? "[filtered]" : scrubValue(item, depth + 1);
  }
  return out;
}

function scrubRecord<T extends Record<string, unknown>>(record: T): T {
  return scrubValue(record, 0) as T;
}

function scrubUrl(url: string): string {
  const cut = url.search(/[?#]/);
  return scrubText(cut === -1 ? url : url.slice(0, cut));
}

function scrubRequest(request: NonNullable<ErrorEvent["request"]>): ErrorEvent["request"] {
  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(request.headers ?? {})) {
    if (KEPT_HEADERS.has(name.toLowerCase())) headers[name] = scrubString(value);
  }
  // Body, cookies, query string and env are left behind on purpose: each can carry a resume,
  // a sign-in code or a session.
  return {
    ...(request.url ? { url: scrubUrl(request.url) } : {}),
    ...(request.method ? { method: request.method } : {}),
    ...(Object.keys(headers).length ? { headers } : {}),
  };
}

const URL_KEYS = new Set(["url", "from", "to"]);

/** Breadcrumbs carry console lines and fetch URLs from before the error. */
export function scrubBreadcrumb(crumb: Breadcrumb): Breadcrumb {
  const next: Breadcrumb = { ...crumb };
  if (next.message) next.message = scrubMessage(next.message);
  if (next.data) {
    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(next.data)) {
      data[key] = URL_KEYS.has(key) && typeof value === "string" ? scrubUrl(value) : value;
    }
    next.data = scrubRecord(data);
  }
  return next;
}

/** beforeSend: returns the same event with everything personal taken out. */
export function scrubEvent<T extends ErrorEvent>(event: T): T {
  if (event.request) event.request = scrubRequest(event.request);
  // Only the opaque id survives: no email, name, username or IP address.
  if (event.user) event.user = event.user.id === undefined ? undefined : { id: event.user.id };
  if (event.message) event.message = scrubMessage(event.message);
  if (event.logentry?.message) event.logentry = { message: scrubMessage(event.logentry.message) };
  if (event.transaction) event.transaction = scrubUrl(event.transaction);
  for (const exception of event.exception?.values ?? []) {
    if (exception.value) exception.value = scrubMessage(exception.value);
    for (const frame of exception.stacktrace?.frames ?? []) delete frame.vars;
  }
  if (event.breadcrumbs) event.breadcrumbs = event.breadcrumbs.map(scrubBreadcrumb);
  if (event.extra) event.extra = scrubRecord(event.extra);
  if (event.contexts) event.contexts = scrubRecord(event.contexts);
  if (event.tags) event.tags = scrubRecord(event.tags);
  return event;
}

const TAG_KEY_LENGTH = 32;
const TAG_VALUE_LENGTH = 200;

/** Log fields as Sentry tags: sensitive names skipped, values masked, within Sentry's limits. */
export function safeTags(fields: Fields): Record<string, string> {
  const tags: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === null || value === undefined || isSensitiveKey(key)) continue;
    const name = key.replace(/[^\w.:-]/g, "_").slice(0, TAG_KEY_LENGTH);
    const text = scrubText(String(value));
    if (name && text.length <= TAG_VALUE_LENGTH) tags[name] = text;
  }
  return tags;
}
