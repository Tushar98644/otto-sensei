"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { OTTO_ERRORS } from "@/components/mascot/error-lines";
import { loadOtto, useLoadedOtto } from "@/components/mascot/lazy-otto";
import { buttonClasses } from "@/components/ui/button-classes";
import { BRAND } from "@/config/brand";
import type { Locale } from "@/i18n/config";
import { reportClientError } from "@/lib/observability/browser";
import { reloadForStaleBuild } from "@/lib/observability/stale-build";
import type { ErrorWords } from "./global-error-words";
import "./globals.css";

// The app's layout and its messages are what broke, so this page carries its few words itself.
const ENGLISH: ErrorWords = {
  heading: "Something went wrong",
  body: `${OTTO_ERRORS.generic} Your work is saved in this browser.`,
  retry: "Try again",
  home: "Go to the home page",
  reference: "Error reference:",
  otto: "Otto the otter, looking worried",
};

// The languages ./global-error-words has; every page carries only the English above.
const OTHERS: Record<Exclude<Locale, "en">, true> = { es: true, "pt-BR": true, fr: true, de: true };

const known = (tag: string | undefined): tag is Locale =>
  tag === "en" || (!!tag && Object.hasOwn(OTHERS, tag));

// LOCALE_COOKIE in i18n/routing, which this page can't import: it reads server settings.
const COOKIE = /(?:^|;\s*)otto_lang=([^;]*)/;

// The otto_lang cookie when the browser can read it, else the language the broken page was in (its <html lang>).
function pageLocale(): Locale {
  const cookie = COOKIE.exec(document.cookie)?.[1];
  if (known(cookie)) return cookie;
  const lang = document.documentElement.lang;
  return known(lang) ? lang : "en";
}

const noChanges = () => () => {};

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const locale = useSyncExternalStore<Locale>(noChanges, pageLocale, () => "en");
  const [other, setOther] = useState<ErrorWords | "failed" | null>(null);
  const t = locale === "en" || other === "failed" ? ENGLISH : other;
  const otto = useLoadedOtto();

  useEffect(() => {
    if (!reloadForStaleBuild(error)) reportClientError(error);
  }, [error]);

  useEffect(() => {
    void loadOtto();
  }, []);

  useEffect(() => {
    if (locale === "en") return;
    let live = true;
    // Shown once they arrive; English if they can't (offline, or the build that broke is gone).
    import("./global-error-words").then(
      ({ OTHER_WORDS }) => {
        if (live) setOther(OTHER_WORDS[locale]);
      },
      () => {
        if (live) setOther("failed");
      },
    );
    return () => {
      live = false;
    };
  }, [locale]);

  return (
    <html lang={t === ENGLISH ? "en" : locale}>
      <body>
        {t ? <title>{`${t.heading} · ${BRAND.name}`}</title> : null}
        <main id="main" className="flex min-h-dvh items-center">
          {t ? (
            <div className="container-page flex flex-col items-center py-24 text-center sm:py-32">
              {otto ? (
                <otto.Otto
                  pose="worried"
                  size={160}
                  title={t.otto}
                  className="size-32 sm:size-40"
                />
              ) : (
                <div className="size-32 shrink-0 sm:size-40" />
              )}
              <h1 className="mt-8 font-display text-5xl/none font-normal tracking-tight text-ink sm:text-7xl/none">
                {t.heading}
              </h1>
              <p className="mt-6 max-w-md text-lg/7 text-muted">{t.body}</p>
              <div className="mt-8 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
                <button type="button" onClick={retry} className={buttonClasses({ size: "lg" })}>
                  {t.retry}
                </button>
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a full page load: the app shell is what broke */}
                <a href="/" className={buttonClasses({ variant: "secondary", size: "lg" })}>
                  {t.home}
                </a>
              </div>
              {error.digest ? (
                <p className="mt-8 text-sm text-subtle">
                  {t.reference} {error.digest}
                </p>
              ) : null}
            </div>
          ) : null}
        </main>
      </body>
    </html>
  );
}
