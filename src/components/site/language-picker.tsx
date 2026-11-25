"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { pageLanguages, type LanguageLinks } from "./page-languages";

// The same page in each language it is published in; full page loads, so <html lang> and the page's words change together.
export function LanguagePicker({
  label,
  current,
  links,
  icon,
  className,
}: {
  label: string;
  current: Locale;
  links: LanguageLinks;
  // Drawn by the server (src/components/site/footer-languages.tsx), so its icon code stays there.
  icon: ReactNode;
  className?: string;
}) {
  // Null outside the app router (tests).
  const languages = pageLanguages(usePathname() ?? "", links);
  if (languages.length < 2) return null;
  return (
    <nav aria-label={label} className={cn("flex items-center gap-2", className)}>
      {icon}
      <ul className="flex flex-wrap items-center gap-x-3">
        {languages.map(({ locale, name, href }) => (
          <li key={locale}>
            <a
              href={href}
              hrefLang={locale}
              lang={locale}
              aria-current={locale === current ? "true" : undefined}
              className="inline-flex min-h-11 items-center text-sm text-muted transition-colors hover:text-ink aria-[current=true]:font-medium aria-[current=true]:text-ink pointer-fine:min-h-8"
            >
              {name}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
