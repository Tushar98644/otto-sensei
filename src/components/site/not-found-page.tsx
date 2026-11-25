import Link from "next/link";
import type { ReactNode } from "react";
import { Otto } from "@/components/mascot/otto";
import { buttonClasses } from "@/components/ui/button";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { loadMessages } from "@/i18n/messages";
import { localizer } from "@/i18n/pages";
import { publishedPages } from "@/i18n/publish";
import { ROUTES } from "./routes";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

// Its async parts are awaited here, so it renders in one pass (tests too). The 404 in a page's language (src/app/[lang]/not-found.tsx), and in English for URLs no route matches (src/app/global-not-found.tsx).
export async function NotFoundPage({
  locale = DEFAULT_LOCALE,
  fonts,
}: {
  locale?: Locale;
  // <NotFoundFonts />, drawn by each 404 screen itself (src/app/site-fonts.test.ts).
  fonts: ReactNode;
}) {
  const site = await loadMessages(locale, "site");
  const href = localizer(locale, await publishedPages(locale));
  return (
    <div className="flex min-h-dvh flex-col">
      {fonts}
      {await SiteHeader({ locale })}
      <main id="main" className="flex flex-1 items-center">
        <div className="container-page flex flex-col items-center py-24 text-center sm:py-32">
          <Otto
            pose="worried"
            size={160}
            title={site.notFound.otto}
            className="size-32 sm:size-40"
          />
          <h1 className="mt-8 font-display text-5xl/none font-normal tracking-tight text-ink sm:text-7xl/none">
            {site.notFound.title}
          </h1>
          <p className="mt-6 max-w-md text-lg/7 text-muted">{site.notFound.text}</p>
          <div className="mt-8 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
            <Link href={ROUTES.studio} prefetch={false} className={buttonClasses({ size: "lg" })}>
              {site.checkMyResume}
            </Link>
            <Link
              href={href(ROUTES.home)}
              className={buttonClasses({ variant: "secondary", size: "lg" })}
            >
              {site.notFound.home}
            </Link>
          </div>
        </div>
      </main>
      {await SiteFooter({ locale })}
    </div>
  );
}
