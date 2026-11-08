"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { loginHref } from "@/components/account/next-path";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { OttoMark } from "@/components/site/otto-mark";
import { ROUTES } from "@/components/site/routes";
import { AccountMenu } from "@/components/studio/account-menu";
import { BRAND } from "@/config/brand";
import { cn } from "@/lib/utils";
import { APP_NAV, isCurrent } from "./nav";

// Below lg the sidebar folds into a top bar plus one segmented strip of sections: every section
// stays one tap away without a hidden drawer.
export function MobileBar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-30 bg-surface-muted lg:hidden">
      <div className="flex h-14 items-center justify-between gap-2 px-4 sm:px-8">
        <Link
          href={ROUTES.dashboard}
          aria-label={`${BRAND.name} home`}
          className="flex h-11 items-center gap-2 rounded-lg pr-1"
        >
          <OttoMark className="size-7" />
          <span className="font-display text-xl/none font-medium tracking-tight text-ink">
            {BRAND.name}
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell align="end" size="md" />
          <AccountMenu onSignIn={() => router.push(loginHref(pathname))} />
        </div>
      </div>
      <nav aria-label="Dashboard" className="px-4 pb-3 sm:px-8">
        <div className="flex gap-1 rounded-xl bg-surface-strong p-1">
          {APP_NAV.filter((item) => !item.desktopOnly).map((item) => {
            const current = isCurrent(item, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={current ? "page" : undefined}
                data-tour={item.href === ROUTES.dashboardResumes ? "dashboard-library" : undefined}
                className={cn(
                  "flex h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-2 text-sm font-medium transition-colors -outline-offset-2 max-sm:px-1 max-sm:text-xs",
                  current ? "bg-surface text-ink shadow-control" : "text-muted hover:text-ink",
                )}
              >
                {/* Small, text-only and short names on small phones, so all five fit without scrolling. */}
                <item.icon className="hidden size-4 shrink-0 sm:block" aria-hidden />
                {item.short ? (
                  <>
                    <span className="truncate md:hidden">{item.short}</span>
                    <span className="truncate max-md:hidden">{item.label}</span>
                  </>
                ) : (
                  <span className="truncate">{item.label}</span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
