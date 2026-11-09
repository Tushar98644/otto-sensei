// Pure and client-safe. The rules for a portfolio's address, /p/<slug>.

export const SLUG_MIN = 3;
export const SLUG_MAX = 40;

// Lowercase letters and digits in words joined by single hyphens: "maya-chen", "dev42".
export const PORTFOLIO_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Words that read as ours, or that a page of the app might want one day. A portfolio at
// /p/support or /p/otto-sensei could pass for an official page.
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  "about",
  "abuse",
  "account",
  "accounts",
  "admin",
  "administrator",
  "api",
  "app",
  "assets",
  "auth",
  "billing",
  "blog",
  "cdn",
  "contact",
  "dashboard",
  "docs",
  "edit",
  "email",
  "example",
  "faq",
  "help",
  "home",
  "index",
  "jobs",
  "legal",
  "login",
  "logout",
  "mail",
  "me",
  "new",
  "null",
  "official",
  "otto",
  "p",
  "portfolio",
  "portfolios",
  "pricing",
  "privacy",
  "pro",
  "max",
  "free",
  "refunds",
  "reminder",
  "resume",
  "resumes",
  "robots",
  "root",
  "s",
  "security",
  "settings",
  "signin",
  "signup",
  "sitemap",
  "staff",
  "static",
  "status",
  "studio",
  "support",
  "team",
  "terms",
  "test",
  "undefined",
  "www",
]);

// Any address starting with the product's name, with or without the hyphen.
const BRAND_PREFIX = /^otto-?sensei/;

export type SlugProblem = "too_short" | "too_long" | "characters" | "reserved";

/**
 * What a person typed, as an address: "  Maya Chén " becomes "maya-chen". Accents are folded,
 * anything that isn't a letter or digit becomes one hyphen, and hyphens at either end go.
 */
export function normalizeSlug(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function slugProblem(slug: string): SlugProblem | null {
  if (slug.length < SLUG_MIN) return "too_short";
  if (slug.length > SLUG_MAX) return "too_long";
  if (!PORTFOLIO_SLUG.test(slug)) return "characters";
  if (RESERVED_SLUGS.has(slug) || BRAND_PREFIX.test(slug)) return "reserved";
  return null;
}

export function isPortfolioSlug(slug: string): boolean {
  return slugProblem(slug) === null;
}

export const SLUG_MESSAGES: Record<SlugProblem | "taken", string> = {
  too_short: `Use at least ${SLUG_MIN} letters or numbers.`,
  too_long: `Keep it to ${SLUG_MAX} characters or fewer.`,
  characters: "Use letters, numbers and single hyphens.",
  reserved: "That address is kept for the app. Try another.",
  taken: "Someone already has that address. Try another.",
};

// Cuts at the last hyphen that fits, so "maya-chen-the-longest..." doesn't end mid-word.
function fit(slug: string, max: number): string {
  if (slug.length <= max) return slug;
  const cut = slug.slice(0, max);
  const lastHyphen = cut.lastIndexOf("-");
  return (lastHyphen >= SLUG_MIN ? cut.slice(0, lastHyphen) : cut).replace(/-+$/, "");
}

/** The address offered from a name: "Maya Chen" gives "maya-chen". Always passes slugProblem. */
export function suggestSlug(name: string): string {
  const base = fit(normalizeSlug(name), SLUG_MAX);
  if (slugProblem(base) === null) return base;
  // A name that is reserved or too short still makes a fine address with a word after it.
  const padded = fit(`${base ? `${base}-` : ""}portfolio`.replace(BRAND_PREFIX, "my"), SLUG_MAX);
  return slugProblem(padded) === null ? padded : "my-portfolio";
}

/** A try when the suggestion is taken: "maya-chen-2" (or a random tail), still within SLUG_MAX. */
export function numberedSlug(base: string, n: number | string): string {
  const suffix = `-${n}`;
  return `${fit(base, SLUG_MAX - suffix.length)}${suffix}`;
}
