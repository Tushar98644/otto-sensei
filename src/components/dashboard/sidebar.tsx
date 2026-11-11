"use client";

import {
  ChevronsUpDown,
  CreditCard,
  LifeBuoy,
  LogOut,
  SlidersHorizontal,
  Sparkles,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { signedOutNote } from "@/components/account/copy";
import { errorMessage } from "@/components/account/errors";
import { useProTools } from "@/components/account/pro-tools";
import { LazyUpgradeDialog } from "@/components/account/lazy-dialogs";
import { patchMe, refreshMe, type Me } from "@/components/account/use-me";
import { FeedbackButton } from "@/components/feedback/feedback-button";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { accountSectionHref } from "@/components/setup/links";
import { OttoMark } from "@/components/site/otto-mark";
import { ROUTES } from "@/components/site/routes";
import { Badge } from "@/components/ui/badge";
import { Menu } from "@/components/ui/menu";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { BRAND } from "@/config/brand";
import { nextPlan, PLANS } from "@/config/plans";
import type { SessionUser } from "@/lib/auth/types";
import { trialHeadline } from "@/lib/billing/prices";
import { useStudioStore } from "@/lib/store/resume-store";
import { signOutAndRelease } from "@/lib/sync/use-cloud-sync";
import { trialEndDay } from "@/lib/usage-copy";
import { cn } from "@/lib/utils";
import { NewResumeMenu } from "./new-resume-menu";
import { LinkPending } from "./link-pending";
import { APP_NAV, APP_NAV_FOOTER, isCurrent, showsProBadge, type AppNavItem } from "./nav";
import { prefetchPageData } from "./prefetch";
import type { StudioActions } from "./use-studio-actions";

const count = new Intl.NumberFormat("en-US");

export function Sidebar({
  user,
  me,
  actions,
}: {
  user: SessionUser;
  me: Me | null;
  actions: StudioActions;
}) {
  const pathname = usePathname();
  const resumeCount = useStudioStore((s) => s.order.length);
  const proTools = useProTools();

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col overflow-y-auto border-r border-border px-3 pt-4 pb-3 lg:flex">
      <div className="flex items-center justify-between gap-2">
        <Link
          href={ROUTES.dashboard}
          aria-label={`${BRAND.name} home`}
          className="flex h-10 items-center gap-2 rounded-lg px-2"
        >
          <OttoMark className="size-7" />
          <span className="font-display text-xl/none font-medium tracking-tight text-ink">
            {BRAND.name}
          </span>
        </Link>
        <NotificationBell />
      </div>

      <NewResumeMenu actions={actions} className="mt-5 w-full" />

      <nav aria-label="Dashboard" className="mt-6 flex flex-col gap-0.5">
        {APP_NAV.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            user={user}
            pathname={pathname}
            proBadge={showsProBadge(item, proTools)}
            count={item.href === ROUTES.dashboardResumes && resumeCount > 0 ? resumeCount : null}
          />
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-2 pt-6">
        <nav aria-label="Trash and account" className="flex flex-col gap-0.5">
          {APP_NAV_FOOTER.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              user={user}
              pathname={pathname}
              proBadge={false}
              count={null}
            />
          ))}
        </nav>
        <FeedbackButton />
        <AccountRow user={user} me={me} />
      </div>
    </aside>
  );
}

function SidebarLink({
  item,
  user,
  pathname,
  proBadge,
  count: total,
}: {
  item: AppNavItem;
  user: SessionUser;
  pathname: string;
  proBadge: boolean;
  count: number | null;
}) {
  const current = isCurrent(item, pathname);
  // Prefetch on intent, not view (18 requests per load); dynamic pages need a full prefetch.
  const [intent, setIntent] = useState(false);
  const showIntent = () => {
    setIntent(true);
    prefetchPageData(item.href, user);
  };
  return (
    <Link
      href={item.href}
      prefetch={intent}
      onMouseEnter={showIntent}
      onFocus={showIntent}
      onTouchStart={showIntent}
      aria-current={current ? "page" : undefined}
      data-tour={item.tour}
      className={cn(
        "flex h-9 shrink-0 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-colors",
        current
          ? "bg-surface text-ink shadow-control ring-1 ring-ink/5"
          : "text-muted hover:bg-ink/5 hover:text-ink",
      )}
    >
      <item.icon className={cn("size-4", current ? "text-ink" : "text-muted")} aria-hidden />
      <span className="flex-1">{item.label}</span>
      <LinkPending />
      {total !== null ? (
        <span className="text-xs text-muted tabular-nums">
          <span className="sr-only">(</span>
          {count.format(total)}
          <span className="sr-only">)</span>
        </span>
      ) : null}
      {proBadge ? (
        <Badge variant="ink" className="h-5 px-1.5">
          Pro
        </Badge>
      ) : null}
    </Link>
  );
}

function planLine(user: SessionUser): string {
  if (user.plan === "free") return "Free plan";
  const name = PLANS[user.plan].name;
  return user.trialEndsAt ? `${name} · trial until ${trialEndDay(user.trialEndsAt)}` : name;
}

function AccountRow({ user, me }: { user: SessionUser; me: Me | null }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const next = nextPlan(user.plan);
  const nextOnSale = next !== null && (me?.billing.offer[next].length ?? 0) > 0;
  const trialOffer = user.plan === "free" && me?.billing.trial === true;

  async function signOut() {
    setSigningOut(true);
    // Also clears the account's backed-up resumes from this browser, for shared computers.
    const signedOut = await signOutAndRelease(user.id).catch((error: unknown) => {
      setSigningOut(false);
      toast({ title: "Couldn't sign you out", description: errorMessage(error), variant: "error" });
      return null;
    });
    if (!signedOut) return;
    patchMe({ user: null, usage: null, period: null });
    toast({ title: "You're signed out.", description: signedOutNote(signedOut.kept) });
    void refreshMe();
  }

  return (
    <>
      <Menu
        label="Account"
        triggerLabel={`Account menu for ${user.email}`}
        triggerClassName="flex h-12 w-full items-center gap-2.5 rounded-lg px-2 text-left transition-colors hover:bg-ink/5 aria-expanded:bg-ink/5"
        className="w-64"
        trigger={
          <>
            <span
              aria-hidden
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-white uppercase"
            >
              {user.email.trim().charAt(0)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm/5 font-medium text-ink">{user.email}</span>
              <span className="block truncate text-xs/4 text-subtle">{planLine(user)}</span>
            </span>
            {signingOut ? (
              <Spinner className="text-muted" />
            ) : (
              <ChevronsUpDown aria-hidden className="size-4 shrink-0 text-muted" />
            )}
          </>
        }
        items={[
          ...(next && nextOnSale
            ? [
                {
                  label: trialOffer ? trialHeadline() : `Upgrade to ${PLANS[next].name}`,
                  icon: Sparkles,
                  onSelect: () => setUpgradeOpen(true),
                },
                "separator" as const,
              ]
            : []),
          {
            label: "Account",
            icon: UserRound,
            onSelect: () => router.push(ROUTES.dashboardAccount),
          },
          {
            label: "Work rights & preferences",
            icon: SlidersHorizontal,
            onSelect: () => router.push(accountSectionHref("work")),
          },
          {
            label: "Plans and pricing",
            icon: CreditCard,
            onSelect: () => router.push(ROUTES.pricing),
          },
          {
            label: `Help: ${BRAND.supportEmail}`,
            icon: LifeBuoy,
            onSelect: () => window.location.assign(`mailto:${BRAND.supportEmail}`),
          },
          "separator",
          {
            label: signingOut ? "Signing out…" : "Sign out",
            icon: LogOut,
            disabled: signingOut,
            onSelect: () => void signOut(),
          },
        ]}
      />
      {nextOnSale ? <LazyUpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} /> : null}
    </>
  );
}
