"use client";

import { useEffect, useSyncExternalStore } from "react";
import { OTTO_ERRORS } from "@/components/mascot/error-lines";
import { Otto } from "@/components/mascot/otto";
import { ROUTES } from "@/components/site/routes";
import { Button, buttonClasses } from "@/components/ui/button";
import { BRAND } from "@/config/brand";
import { isEnabledLocale, matchLocale, type Locale } from "@/i18n/config";
import { reportClientError } from "@/lib/observability/browser";
import { reloadForStaleBuild } from "@/lib/observability/stale-build";
import "./globals.css";

type Words = {
  title: string;
  heading: string;
  body: string;
  retry: string;
  home: string;
  reference: string;
  otto: string;
};

// The app's layout and its messages are what broke, so this page carries its few words itself.
const WORDS: Record<Locale, Words> = {
  en: {
    title: "Something went wrong",
    heading: "Something went wrong",
    body: `${OTTO_ERRORS.generic} Your work is saved in this browser.`,
    retry: "Try again",
    home: "Go to the home page",
    reference: "Error reference:",
    otto: "Otto the otter, looking worried",
  },
  es: {
    title: "Algo salió mal",
    heading: "Algo salió mal",
    body: "Algo falló de mi lado. ¿Lo intentas de nuevo? Tu trabajo está guardado en este navegador.",
    retry: "Intentar de nuevo",
    home: "Ir a la página de inicio",
    reference: "Referencia del error:",
    otto: "Otto la nutria, con cara de preocupación",
  },
  "pt-BR": {
    title: "Algo deu errado",
    heading: "Algo deu errado",
    body: "Algo falhou do meu lado. Pode tentar de novo? Seu trabalho está salvo neste navegador.",
    retry: "Tentar de novo",
    home: "Ir para a página inicial",
    reference: "Referência do erro:",
    otto: "Otto, a lontra, com cara de preocupação",
  },
  fr: {
    title: "Un problème est survenu",
    heading: "Un problème est survenu",
    body: "Quelque chose a planté de mon côté. Tu peux réessayer ? Ton travail est enregistré dans ce navigateur.",
    retry: "Réessayer",
    home: "Aller à l'accueil",
    reference: "Référence de l'erreur :",
    otto: "Otto la loutre, l'air inquiet",
  },
  de: {
    title: "Etwas ist schiefgelaufen",
    heading: "Etwas ist schiefgelaufen",
    body: "Bei mir ist etwas schiefgelaufen. Versuchst du es noch mal? Deine Arbeit ist in diesem Browser gespeichert.",
    retry: "Erneut versuchen",
    home: "Zur Startseite",
    reference: "Fehlerreferenz:",
    otto: "Otto der Otter, besorgt",
  },
};

// LOCALE_COOKIE in i18n/routing, which this page can't import: it reads server settings.
const COOKIE = /(?:^|;\s*)otto_lang=([^;]*)/;

// The otto_lang cookie when the browser can read it, else the language the broken page was in.
function pageLocale(): Locale {
  const cookie = COOKIE.exec(document.cookie)?.[1];
  if (isEnabledLocale(cookie)) return cookie;
  const lang = matchLocale(document.documentElement.lang);
  return isEnabledLocale(lang) ? lang : "en";
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
  const t = WORDS[locale];

  useEffect(() => {
    if (!reloadForStaleBuild(error)) reportClientError(error);
  }, [error]);

  return (
    <html lang={locale}>
      <body>
        <title>{`${t.title} · ${BRAND.name}`}</title>
        <main id="main" className="flex min-h-dvh items-center">
          <div className="container-page flex flex-col items-center py-24 text-center sm:py-32">
            <Otto pose="worried" size={160} title={t.otto} className="size-32 sm:size-40" />
            <h1 className="mt-8 font-display text-5xl/none font-normal tracking-tight text-ink sm:text-7xl/none">
              {t.heading}
            </h1>
            <p className="mt-6 max-w-md text-lg/7 text-muted">{t.body}</p>
            <div className="mt-8 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
              <Button size="lg" onClick={retry}>
                {t.retry}
              </Button>
              {/* A full page load, not a client navigation: the app shell is what broke. */}
              <a href={ROUTES.home} className={buttonClasses({ variant: "secondary", size: "lg" })}>
                {t.home}
              </a>
            </div>
            {error.digest ? (
              <p className="mt-8 text-sm text-subtle">
                {t.reference} {error.digest}
              </p>
            ) : null}
          </div>
        </main>
      </body>
    </html>
  );
}
