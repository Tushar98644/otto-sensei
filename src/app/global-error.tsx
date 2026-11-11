"use client";

import { useEffect } from "react";
import { OTTO } from "@/components/mascot/lines";
import { Otto } from "@/components/mascot/otto";
import { ROUTES } from "@/components/site/routes";
import { Button, buttonClasses } from "@/components/ui/button";
import { BRAND } from "@/config/brand";
import { reportClientError } from "@/lib/observability/browser";
import "./globals.css";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    reportClientError(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <title>{`Something went wrong · ${BRAND.name}`}</title>
        <main id="main" className="flex min-h-dvh items-center">
          <div className="container-page flex flex-col items-center py-24 text-center sm:py-32">
            <Otto
              pose="worried"
              size={160}
              title="Otto the otter, looking worried"
              className="size-32 sm:size-40"
            />
            <h1 className="mt-8 font-display text-5xl/none font-normal tracking-tight text-ink sm:text-7xl/none">
              Something went wrong
            </h1>
            <p className="mt-6 max-w-md text-lg/7 text-muted">
              {OTTO.errors.generic} Your work is saved in this browser.
            </p>
            <div className="mt-8 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
              <Button size="lg" onClick={retry}>
                Try again
              </Button>
              {/* A full page load, not a client navigation: the app shell is what broke. */}
              <a href={ROUTES.home} className={buttonClasses({ variant: "secondary", size: "lg" })}>
                Go to the home page
              </a>
            </div>
            {error.digest ? (
              <p className="mt-8 text-sm text-subtle">Error reference: {error.digest}</p>
            ) : null}
          </div>
        </main>
      </body>
    </html>
  );
}
