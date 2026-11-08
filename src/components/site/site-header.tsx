import { HeaderActions, MainNavLinks } from "./account-link";
import { MobileNav } from "./mobile-nav";
import { SiteLogo } from "./site-logo";

// Static on purpose, so every marketing page stays a CDN-cached file. Only the nav and the actions
// read the session, in the browser, and switch to the signed-in header; signed-in visitors to "/"
// are sent to the dashboard by src/proxy.ts before this renders.
export function SiteHeader() {
  return (
    // Sticky makes the header the containing block for the mobile menu panel.
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="@container container-page flex h-16 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-6">
          <SiteLogo compact />
          <MainNavLinks />
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <HeaderActions />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
