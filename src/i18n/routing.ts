import { isProduction } from "@/lib/env";
import {
  DEFAULT_LOCALE,
  isEnabledLocale,
  localeFromSegment,
  localeSegment,
  type Locale,
} from "./config";

// The app's language, chosen in its settings; read by src/proxy.ts for the app paths below.
export const LOCALE_COOKIE = "otto_lang";

export function localeCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction(),
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
  } as const;
}

// Their language comes from the cookie, never the URL, so an address works for everyone.
export const APP_SECTIONS = [
  "/dashboard",
  "/studio",
  "/account",
  "/reminder",
  "/s",
  "/extension",
] as const;

// Served outside [lang]: route folders, Next's files and public/'s folders (routing.test.ts keeps this in step).
const OUTSIDE_LANG = new Set([
  "api",
  "auth",
  "p",
  "_next",
  "brand",
  "email",
  "fonts",
  "formats",
  "guides",
  "portfolio-shots",
  "portfolio-templates",
]);

// App-level metadata routes; files at public/'s root have extensions the matcher in src/proxy.ts already skips.
const ROOT_FILES = new Set([
  "/apple-icon",
  "/opengraph-image",
  "/icon.svg",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
  "/llms.txt",
  "/llms-full.txt",
]);

export type LocaleRoute =
  | { action: "pass" }
  | { action: "redirect"; pathname: string; status: 307 | 308; cookie?: Locale }
  // pathname is the visible path without a locale prefix; the page renders from /{segment}{pathname}.
  | { action: "serve"; locale: Locale; pathname: string };

function isWithin(pathname: string, section: string): boolean {
  return pathname === section || pathname.startsWith(`${section}/`);
}

export function isAppPath(pathname: string): boolean {
  return APP_SECTIONS.some((section) => isWithin(pathname, section));
}

export function cookieLocale(value: string | undefined): Locale | null {
  return isEnabledLocale(value) ? value : null;
}

export function internalPath(locale: Locale, pathname: string): string {
  return `/${localeSegment(locale)}${pathname === "/" ? "" : pathname}`;
}

// What src/proxy.ts does with a path before sign-in checks: English is unprefixed, /en/* moves there for good.
export function routeLocale(pathname: string, cookie: string | undefined): LocaleRoute {
  const [, first = "", ...rest] = pathname.split("/");
  if (ROOT_FILES.has(pathname) || (rest.length > 0 && OUTSIDE_LANG.has(first))) {
    return { action: "pass" };
  }
  const prefixed = localeFromSegment(first);
  if (prefixed && isEnabledLocale(prefixed)) {
    // Never //host: a protocol-relative Location would leave the site.
    const unprefixed = `/${rest.join("/").replace(/^\/+/, "")}`;
    if (isAppPath(unprefixed)) {
      return { action: "redirect", pathname: unprefixed, status: 307, cookie: prefixed };
    }
    if (prefixed === DEFAULT_LOCALE)
      return { action: "redirect", pathname: unprefixed, status: 308 };
    return { action: "serve", locale: prefixed, pathname: unprefixed };
  }
  // A prefix that isn't live yet is just an unknown path: /en/es/… is the English 404.
  const locale = isAppPath(pathname) ? (cookieLocale(cookie) ?? DEFAULT_LOCALE) : DEFAULT_LOCALE;
  return { action: "serve", locale, pathname };
}
