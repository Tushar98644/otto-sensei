import { DEFAULT_LOCALE, localeFromSegment, localeSegment, type Locale } from "./config";
import type { Namespace } from "./messages";

// The header and footer around every public page.
export const FRAME_NAMESPACES = ["common", "site"] as const satisfies readonly Namespace[];

// Each public page (and the pages under it) with the namespaces it reads; src/i18n/publish.ts publishes it in a locale once all are translated.
export const PAGE_NAMESPACES = {
  "/": ["home", "pricing"],
  "/pricing": ["pricing"],
  "/job-match": ["jobMatch", "matchCheck"],
  "/resume-builder": ["product", "pricing"],
  "/cover-letter-generator": ["product"],
  "/job-application-tracker": ["product"],
  "/interview-prep": ["product"],
  "/portfolio-website-builder": ["product"],
  // The sign-in form itself is the app's (src/components/account), translated with it.
  "/login": ["login", "account", "signIn"],
  "/privacy": ["legal"],
  "/terms": ["legal"],
  "/refunds": ["legal"],
  "/acceptable-use": ["legal"],
  // The guides (P5): each section publishes on its own, once its namespace is translated.
  "/resume-examples": ["product", "seo", "resumeExamples", "lint"],
  "/resume-templates": ["product", "seo", "resumeTemplates"],
  "/ats": ["product", "seo", "ats"],
  "/compare": ["product", "seo", "compare"],
} as const satisfies Record<string, readonly Namespace[]>;

export type PageKey = keyof typeof PAGE_NAMESPACES;

export const PAGE_KEYS = Object.keys(PAGE_NAMESPACES) as PageKey[];

// The sections with pages under them; every other key is a single page.
const SECTIONS: ReadonlySet<PageKey> = new Set([
  "/login",
  "/resume-examples",
  "/ats",
  "/compare",
] satisfies PageKey[]);

export function pageNamespaces(key: PageKey): readonly Namespace[] {
  return [...FRAME_NAMESPACES, ...PAGE_NAMESPACES[key]];
}

const pathOnly = (href: string) => /^[^?#]*/.exec(href)?.[0] || "/";

// The public page a path belongs to, itself or the section above it; null for the app and unknown paths.
export function pageKey(href: string): PageKey | null {
  const path = pathOnly(href);
  return (
    PAGE_KEYS.find((key) => path === key || (SECTIONS.has(key) && path.startsWith(`${key}/`))) ??
    null
  );
}

// A path in a locale: English unprefixed, others under their segment, keeping any ?query and #hash.
export function localizedPath(locale: Locale, href: string): string {
  if (locale === DEFAULT_LOCALE) return href;
  const path = pathOnly(href);
  const rest = href.slice(/^[^?#]*/.exec(href)?.[0].length ?? 0);
  return `/${localeSegment(locale)}${path === "/" ? "" : path}${rest}`;
}

// The path without its locale prefix: /es/pricing, /en/pricing (the internal one) and /pricing are all /pricing.
export function unprefixedPath(pathname: string): string {
  const [, first = "", ...rest] = pathname.split("/");
  return localeFromSegment(first) ? `/${rest.join("/")}` : pathname;
}

export type Localize = (href: string) => string;

// Links on a page in this locale: to its own version of each published page, else the plain (English or app) path.
export function localizer(locale: Locale, published: ReadonlySet<PageKey>): Localize {
  return (href) => {
    if (locale === DEFAULT_LOCALE || !href.startsWith("/") || href.startsWith("//")) return href;
    const key = pageKey(href);
    return key && published.has(key) ? localizedPath(locale, href) : href;
  };
}
