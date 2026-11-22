// Handles are the part of the address a person picks. Shared by the browser and the server.

export const HANDLE_LIMITS = { min: 3, max: 30 } as const;

// A retired handle still takes mail for 14 days, and nobody else can take it for 90.
export const HANDLE_ROUTES_MS = 14 * 86_400_000;
export const HANDLE_HOLD_MS = 90 * 86_400_000;

const SHAPE = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;

const RESERVED = new Set([
  "abuse",
  "account",
  "accounts",
  "admin",
  "administrator",
  "api",
  "billing",
  "bounce",
  "bounces",
  "careers",
  "contact",
  "daemon",
  "dmarc",
  "feedback",
  "help",
  "hello",
  "hostmaster",
  "hr",
  "info",
  "jobs",
  "legal",
  "mail",
  "mailer-daemon",
  "marketing",
  "news",
  "newsletter",
  "no-reply",
  "noreply",
  "notifications",
  "otto",
  "ottosensei",
  "otto-sensei",
  "payments",
  "postmaster",
  "privacy",
  "recruiting",
  "root",
  "sales",
  "security",
  "staff",
  "support",
  "system",
  "team",
  "test",
  "track",
  "webmaster",
  "www",
]);

export type HandleProblem = "short" | "long" | "shape" | "reserved";

export const HANDLE_PROBLEMS: Record<HandleProblem, string> = {
  short: `Use at least ${HANDLE_LIMITS.min} characters.`,
  long: `Use at most ${HANDLE_LIMITS.max} characters.`,
  shape: "Use lowercase letters and numbers, with single dots or hyphens between them.",
  reserved: "That one is kept for Otto. Try another.",
};

export function normalizeHandle(input: string): string {
  return input.trim().toLowerCase();
}

export function handleProblem(handle: string): HandleProblem | null {
  if (handle.length < HANDLE_LIMITS.min) return "short";
  if (handle.length > HANDLE_LIMITS.max) return "long";
  if (!SHAPE.test(handle)) return "shape";
  const bare = handle.replace(/[.-]/g, "");
  if (
    RESERVED.has(handle) ||
    RESERVED.has(bare) ||
    /^(?:otto|admin|support|postmaster)\b/.test(handle)
  ) {
    return "reserved";
  }
  return null;
}

function slug(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .replace(/\.{2,}/g, ".")
    .slice(0, HANDLE_LIMITS.max)
    .replace(/[.-]+$/, "");
}

// From the person's name if we have one, else the part of their email before the @.
export function suggestHandle(name: string, email: string): string {
  const local = (email.split("@")[0] ?? "").split("+")[0] ?? "";
  for (const candidate of [slug(name), slug(local), `${slug(local)}.jobs`]) {
    if (candidate && handleProblem(candidate) === null) return candidate;
  }
  return "";
}

// More to offer when the first choice is taken: a number, then the year.
export function handleVariants(handle: string, year: number): string[] {
  const base = handle.slice(0, HANDLE_LIMITS.max - 5).replace(/[.-]+$/, "");
  return [
    `${base}.jobs`,
    `${base}${year % 100}`,
    `${base}.${year}`,
    ...[2, 3, 4, 5].map((n) => `${base}${n}`),
  ].filter((candidate) => handleProblem(candidate) === null);
}
