import type { Locale } from "@/i18n/config";
import { loadMessages } from "@/i18n/messages";
import { localizer } from "@/i18n/pages";
import { publishedPages } from "@/i18n/publish";
import { HeaderActions, MainNavLinks } from "./account-link";
import { MobileNav } from "./mobile-nav";
import { mainNav, ROUTES } from "./routes";
import { SiteLogo } from "./site-logo";
import type { HeaderCopy } from "./use-account-link";

export async function headerCopy(locale: Locale): Promise<HeaderCopy> {
  const { nav, checkMyResume } = await loadMessages(locale, "site");
  const href = localizer(locale, await publishedPages(locale));
  return {
    navLabel: nav.label,
    nav: mainNav(nav).map((link) => ({ ...link, href: href(link.href) })),
    signIn: { href: href(ROUTES.login), label: nav.signIn },
    dashboard: nav.dashboard,
    checkMyResume,
    menu: nav.menu,
    homePath: href(ROUTES.home),
  };
}

// Static so marketing pages stay CDN-cached; the session is read in the browser.
export async function SiteHeader({ locale }: { locale: Locale }) {
  const copy = await headerCopy(locale);
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="@container container-page flex h-16 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-6">
          <SiteLogo compact href={copy.homePath} />
          <MainNavLinks copy={copy} />
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <HeaderActions copy={copy} />
          <MobileNav copy={copy} />
        </div>
      </div>
    </header>
  );
}
