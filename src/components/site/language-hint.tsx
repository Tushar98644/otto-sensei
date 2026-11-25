"use client";

import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { DEFAULT_LOCALE, matchLocale, type Locale } from "@/i18n/config";
import { pageLanguages, type LanguageLinks } from "./page-languages";

export type HintCopy = { text: string; link: string; dismiss: string };

export const HINT_DISMISSED_KEY = "otto_language_hint";

const noSubscription = () => () => {};

// Read once: the same array each render, as useSyncExternalStore needs.
let languagesRead: readonly string[] | null = null;

function browserLanguages(): readonly string[] {
  languagesRead ??= navigator.languages?.length ? navigator.languages : [navigator.language];
  return languagesRead;
}

function dismissed(): boolean {
  try {
    return window.localStorage.getItem(HINT_DISMISSED_KEY) !== null;
  } catch {
    return false;
  }
}

function remember(): void {
  try {
    window.localStorage.setItem(HINT_DISMISSED_KEY, "1");
  } catch {
    // Private windows can refuse storage; the bar just comes back next time.
  }
}

// The browser's first language that this page is published in, other than English.
export function hintTarget(
  languages: readonly string[],
  available: readonly { locale: Locale; href: string }[],
): { locale: Locale; href: string } | null {
  for (const tag of languages) {
    const locale = matchLocale(tag);
    if (locale === DEFAULT_LOCALE) return null;
    const found = available.find((entry) => entry.locale === locale);
    if (found) return found;
  }
  return null;
}

// English pages only: offers this page in the browser's language, never redirects. Fixed, so nothing moves.
export type HintProps = {
  hints: Partial<Record<Locale, HintCopy>>;
  links: LanguageLinks;
};

export function LanguageHint({ hints, links }: HintProps) {
  const pathname = usePathname() ?? "";
  // The server and hydration see no browser and render nothing; the browser's values follow.
  const languages = useSyncExternalStore(noSubscription, browserLanguages, () => null);
  const wasDismissed = useSyncExternalStore(noSubscription, dismissed, () => true);
  const [closed, setClosed] = useState(false);
  const target =
    languages && !wasDismissed && !closed
      ? hintTarget(languages, pageLanguages(pathname, links))
      : null;
  const copy = target ? hints[target.locale] : undefined;
  if (!target || !copy) return null;
  return (
    <div
      lang={target.locale}
      role="region"
      aria-label={copy.text}
      className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-ink py-2 pr-2 pl-4 text-sm text-white shadow-float sm:inset-x-auto sm:right-4 sm:bottom-4"
    >
      <p className="min-w-0 flex-1">
        {copy.text}{" "}
        <a
          href={target.href}
          hrefLang={target.locale}
          className="font-medium underline underline-offset-4"
        >
          {copy.link}
        </a>
      </p>
      <button
        type="button"
        onClick={() => {
          remember();
          setClosed(true);
        }}
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/10 pointer-fine:size-8"
      >
        <X aria-hidden className="size-4" />
        <span className="sr-only">{copy.dismiss}</span>
      </button>
    </div>
  );
}
