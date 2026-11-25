"use client";

import { Globe } from "lucide-react";
import { usePathname } from "next/navigation";
import { ENABLED_LOCALES, LANGUAGE_NAMES, type Locale } from "@/i18n/config";
import { localizedPath, pageKey, unprefixedPath, type PageKey } from "@/i18n/pages";
import { cn } from "@/lib/utils";

export type PublishedPages = Partial<Record<Locale, readonly PageKey[]>>;

// The languages this path is published in; the server renders /en/… and the browser sees /…, so both read the same.
export function pageLanguages(pathname: string, published: PublishedPages) {
  const path = unprefixedPath(pathname);
  const key = pageKey(path);
  const locales = key ? ENABLED_LOCALES.filter((locale) => published[locale]?.includes(key)) : [];
  return locales.map((locale) => ({ locale, href: localizedPath(locale, path) }));
}

// The same page in each language it is published in; full page loads, so <html lang> and the page's words change together.
export function LanguagePicker({
  label,
  current,
  published,
  className,
}: {
  label: string;
  current: Locale;
  published: PublishedPages;
  className?: string;
}) {
  // Null outside the app router (tests).
  const languages = pageLanguages(usePathname() ?? "", published);
  if (languages.length < 2) return null;
  return (
    <nav aria-label={label} className={cn("flex items-center gap-2", className)}>
      <Globe aria-hidden className="size-4 shrink-0 text-subtle" />
      <ul className="flex flex-wrap items-center gap-x-3">
        {languages.map(({ locale, href }) => (
          <li key={locale}>
            <a
              href={href}
              hrefLang={locale}
              lang={locale}
              aria-current={locale === current ? "true" : undefined}
              className="inline-flex min-h-11 items-center text-sm text-muted transition-colors hover:text-ink aria-[current=true]:font-medium aria-[current=true]:text-ink pointer-fine:min-h-8"
            >
              {LANGUAGE_NAMES[locale]}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
