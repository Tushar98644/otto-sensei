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
import type { SessionUser } from "@/lib/auth/types";
import { cn } from "@/lib/utils";
import { useHoverIntent } from "./hover-intent";
import { LinkPending } from "./link-pending";
import { isCurrent, PHONE_MORE, PHONE_TABS, showsProMark, type AppNavItem } from "./nav";
import { prefetchPageData } from "./prefetch";

// flex-auto, not flex-1: sized by its label, so "Applications" fits beside the others at 360px.
const SEGMENT =
  "relative flex h-10 min-w-0 flex-auto items-center justify-center gap-2 rounded-lg px-2 text-sm font-medium transition-colors duration-150 ease-out -outline-offset-2 pointer-coarse:h-11 max-sm:px-1 max-sm:text-xs";
const CURRENT = "bg-surface text-ink shadow-control";
const IDLE = "text-muted hover:text-ink aria-expanded:text-ink";

export function MobileBar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const proTools = useProTools();
  const moreCurrent = PHONE_MORE.find((item) => isCurrent(item, pathname));

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
          {PHONE_TABS.map((item) => (
            <PhoneTab key={item.href} item={item} user={user} current={isCurrent(item, pathname)} />
          ))}
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
              checked: isCurrent(item, pathname),
              pro: showsProMark(item, proTools),
              onSelect: () => router.push(item.href),
            }))}
          />
        </div>
      </nav>
    </header>
  );
}

function PhoneTab({
  item,
  user,
  current,
}: {
  item: AppNavItem;
  user: SessionUser;
  current: boolean;
}) {
  const [intent, setIntent] = useState(false);
  const intentHandlers = useHoverIntent(() => {
    setIntent(true);
    prefetchPageData(item.href, user);
  });
  return (
    <Link
      href={item.href}
      prefetch={intent}
      {...intentHandlers}
      aria-current={current ? "page" : undefined}
      data-tour={item.tour}
      className={cn(SEGMENT, current ? CURRENT : IDLE)}
    >
      <LinkPending variant="bar" />
      <item.icon className="hidden size-4 shrink-0 sm:block" aria-hidden />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}
