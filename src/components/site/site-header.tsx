import { HeaderActions, MainNavLinks } from "./account-link";
import { MobileNav } from "./mobile-nav";
import { SiteLogo } from "./site-logo";

export type SiteHeaderProps = {
  // False on a page whose body leads with the same "Check my resume" key.
  cta?: boolean;
};

// Static so marketing pages stay CDN-cached; the session is read in the browser.
export function SiteHeader({ cta = true }: SiteHeaderProps = {}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="@container container-page flex h-16 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-6">
          <SiteLogo compact />
          <MainNavLinks />
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <HeaderActions cta={cta} />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
