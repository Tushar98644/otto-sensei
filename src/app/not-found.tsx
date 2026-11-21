import type { Metadata } from "next";
import Link from "next/link";
import { OTTO } from "@/components/mascot/lines";
import { Otto } from "@/components/mascot/otto";
import { ROUTES } from "@/components/site/routes";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="main" className="flex flex-1 items-center">
        <div className="container-page flex flex-col items-center py-24 text-center sm:py-32">
          <Otto
            pose="worried"
            size={160}
            title="Otto the otter, looking worried"
            className="size-32 sm:size-40"
          />
          <h1 className="mt-8 font-display text-5xl/none font-normal tracking-tight text-ink sm:text-7xl/none">
            Page not found
          </h1>
          <p className="mt-6 max-w-md text-lg/7 text-muted">
            {OTTO.errors.notFound} The link may be old or mistyped.
          </p>
          <div className="mt-8 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
            <Link href={ROUTES.studio} prefetch={false} className={buttonClasses({ size: "lg" })}>
              Check my resume
            </Link>
            <Link
              href={ROUTES.home}
              className={buttonClasses({ variant: "secondary", size: "lg" })}
            >
              Go to the home page
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
