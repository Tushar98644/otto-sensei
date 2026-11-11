"use client";

import { Ellipsis } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { loginHref } from "@/components/account/next-path";
import { useProTools } from "@/components/account/pro-tools";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { OttoMark } from "@/components/site/otto-mark";
import { ROUTES } from "@/components/site/routes";
import { AccountMenu } from "@/components/studio/account-menu";
import { Menu } from "@/components/ui/menu";
import { BRAND } from "@/config/brand";
import { cn } from "@/lib/utils";
import { LinkPending } from "./link-pending";
import { isCurrent, PHONE_MORE, PHONE_TABS, showsProBadge } from "./nav";

const SEGMENT =
  "relative flex h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-2 text-sm font-medium transition-colors -outline-offset-2 max-sm:px-1 max-sm:text-xs";
const CURRENT = "bg-surface text-ink shadow-control";
const IDLE = "text-muted hover:text-ink aria-expanded:text-ink";

// Below lg the sidebar folds into a top bar plus one segmented strip: the four sections people use
// most, then "More" for the rest, so every section stays two taps away at most.
export function MobileBar() {
  const pathname = usePathname();
  const router = useRouter();
  const proTools = useProTools();
  const moreCurrent = PHONE_MORE.find((item) => isCurrent(item, pathname));
  const [intent, setIntent] = useState<string[]>([]);
  const showIntent = (href: string) =>
    setIntent((list) => (list.includes(href) ? list : [...list, href]));

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
          {PHONE_TABS.map((item) => {
            const current = isCurrent(item, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                // Prefetched on a touch or focus, as in the sidebar (see SidebarLink).
                prefetch={intent.includes(item.href) ? null : false}
                onTouchStart={() => showIntent(item.href)}
                onMouseEnter={() => showIntent(item.href)}
                onFocus={() => showIntent(item.href)}
                aria-current={current ? "page" : undefined}
                data-tour={item.tour}
                className={cn(SEGMENT, current ? CURRENT : IDLE)}
              >
                <LinkPending variant="bar" />
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
          <Menu
            label="More sections"
            align="end"
            triggerLabel={moreCurrent ? `More sections, now on ${moreCurrent.label}` : "More sections"}
            triggerClassName={cn(SEGMENT, moreCurrent ? CURRENT : IDLE)}
            trigger={
              <>
                <Ellipsis className="hidden size-4 shrink-0 sm:block" aria-hidden />
                <span className="truncate">More</span>
              </>
            }
            items={PHONE_MORE.map((item) => ({
              label: item.label,
              icon: item.icon,
              // The section you're on gets the menu's check, so "More" still says where you are.
              checked: isCurrent(item, pathname),
              description: showsProBadge(item, proTools) ? "Comes with Pro" : undefined,
              onSelect: () => router.push(item.href),
            }))}
          />
        </div>
      </nav>
    </header>
  );
}
