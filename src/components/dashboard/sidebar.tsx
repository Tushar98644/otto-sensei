"use client";

import {
  ChevronsUpDown,
  CircleArrowUp,
  CreditCard,
  LifeBuoy,
  LogOut,
  Search,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useSignedOutNote } from "@/components/account/use-sign-in-words";
import { errorMessage } from "@/components/account/errors";
import { useProTools } from "@/components/account/pro-tools";
import { LazyUpgradeDialog } from "@/components/account/lazy-dialogs";
import { patchMe, refreshMe, type Me } from "@/components/account/use-me";
import { FeedbackButton } from "@/components/feedback/feedback-button";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { accountSectionHref } from "@/components/setup/links";
import { OttoMark } from "@/components/site/otto-mark";
import { ROUTES } from "@/components/site/routes";
import { Menu } from "@/components/ui/menu";
import { ProMark } from "@/components/ui/pro-mark";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { BRAND } from "@/config/brand";
import { nextPlan, PLANS } from "@/config/plans";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import type { SessionUser } from "@/lib/auth/types";
import { useStudioStore } from "@/lib/store/resume-store";
import { signOutAndRelease } from "@/lib/sync/use-cloud-sync";
import { cn } from "@/lib/utils";
import { openCommandPalette, useCommandPaletteShortcut } from "./command-palette-store";
import { FocusMusicToggle } from "./focus-music/focus-music-toggle";
import { useHoverIntent, useSettled } from "./hover-intent";
import type { DashboardMessages } from "./i18n";
import { NewResumeMenu } from "./new-resume-menu";
import { LinkPending } from "./link-pending";
import { APP_NAV, APP_NAV_FOOTER, isCurrent, showsProMark, type AppNavItem } from "./nav";
import { offerLabel } from "./plan-slip";
import { preloadPageCode } from "./page-code";
import { prefetchPageData } from "./prefetch";
import { SidebarPlan } from "./sidebar-plan";
import type { StudioActions } from "./use-studio-actions";

type Upgrade = { label: string; open: () => void };

// The 215px row can't fit the wordmark and two 44px keys, so they stay 36px on touch screens too.
const CHROME_KEY = "pointer-coarse:size-9";

export function Sidebar({
  user,
  me,
  actions,
}: {
  user: SessionUser;
  me: Me | null;
  actions: StudioActions;
}) {
  const t = useMessages("dashboard");
  const pathname = usePathname();
  const resumeCount = useStudioStore((s) => s.order.length);
  const proTools = useProTools();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const next = nextPlan(user.plan);
  const nextOnSale = next !== null && (me?.billing.offer[next].length ?? 0) > 0;
  const upgrade: Upgrade | null =
    next && nextOnSale
      ? {
          label:
            user.plan === "free"
              ? offerLabel(me?.billing.trial === true, t)
              : fmt(t.shell.upgradeTo, { plan: PLANS[next].name }),
          open: () => setUpgradeOpen(true),
        }
      : null;

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col overflow-y-auto border-r border-border px-3 pt-4 pb-3 lg:flex">
      <div className="flex items-center justify-between">
        <Link
          href={ROUTES.dashboard}
          aria-label={fmt(t.shell.brandHome, { brand: BRAND.name })}
          className="flex h-10 items-center gap-2 rounded-lg px-2"
        >
          <OttoMark className="size-7" />
          <span className="font-display text-xl/none font-medium tracking-tight text-ink">
            {BRAND.name}
          </span>
        </Link>
        <div className="flex items-center">
          <FocusMusicToggle className={CHROME_KEY} />
          <NotificationBell className={CHROME_KEY} />
        </div>
      </div>

      <NewResumeMenu actions={actions} className="mt-5 w-full" />

      <nav aria-label={t.shell.nav} className="mt-6 flex flex-col gap-0.5">
        {APP_NAV.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            user={user}
            pathname={pathname}
            pro={showsProMark(item, proTools)}
            count={item.href === ROUTES.dashboardResumes && resumeCount > 0 ? resumeCount : null}
          />
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-3 pt-6">
        <div className="flex flex-col gap-0.5">
          <nav aria-label={t.shell.morePages} className="flex flex-col gap-0.5">
            {APP_NAV_FOOTER.map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                user={user}
                pathname={pathname}
                pro={false}
                count={null}
                quiet
              />
            ))}
          </nav>
          <FeedbackButton className="font-normal" />
        </div>
        <SidebarPlan user={user} me={me} onUpgrade={() => setUpgradeOpen(true)} />
        <AccountRow user={user} upgrade={upgrade} t={t} />
      </div>
      {nextOnSale ? <LazyUpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} /> : null}
    </aside>
  );
}

function SidebarLink({
  item,
  user,
  pathname,
  pro,
  count: total,
  quiet = false,
}: {
  item: AppNavItem;
  user: SessionUser;
  pathname: string;
  pro: boolean;
  count: number | null;
  quiet?: boolean;
}) {
  const { nav } = useMessages("dashboard");
  const format = useFormat();
  const current = isCurrent(item, pathname);
  // Each page comes in full once this one has settled, so a click needs no server trip; data waits for intent.
  const settled = useSettled();
  const [intent, setIntent] = useState(false);
  const intentHandlers = useHoverIntent(() => {
    setIntent(true);
    prefetchPageData(item.href, user);
    preloadPageCode(item.href);
  });
  return (
    <Link
      href={item.href}
      prefetch={item.eager || settled || intent}
      {...intentHandlers}
      aria-current={current ? "page" : undefined}
      data-tour={item.tour}
      className={cn(
        "flex h-9 shrink-0 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors",
        quiet ? "font-normal" : "font-medium",
        current
          ? "bg-surface text-ink shadow-control ring-1 ring-ink/5"
          : "text-muted hover:bg-ink/5 hover:text-ink",
      )}
    >
      <item.icon className={cn("size-4", current ? "text-ink" : "text-muted")} aria-hidden />
      <span className="flex-1">{nav[item.key]}</span>
      <LinkPending />
      {total !== null ? (
        <span className="text-xs text-muted tabular-nums">
          <span className="sr-only">(</span>
          {format.number(total)}
          <span className="sr-only">)</span>
        </span>
      ) : null}
      {pro ? <ProMark /> : null}
    </Link>
  );
}

function planLine(user: SessionUser, t: DashboardMessages): string {
  if (user.plan === "free") return t.shell.freePlan;
  const name = PLANS[user.plan].name;
  return user.trialEndsAt ? fmt(t.shell.trialPlan, { plan: name }) : name;
}

function AccountRow({
  user,
  upgrade,
  t,
}: {
  user: SessionUser;
  upgrade: Upgrade | null;
  t: DashboardMessages;
}) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const shortcut = useCommandPaletteShortcut();
  const signedOutNote = useSignedOutNote();

  async function signOut() {
    setSigningOut(true);
    // Also clears the account's backed-up resumes from this browser, for shared computers.
    const signedOut = await signOutAndRelease(user.id).catch((error: unknown) => {
      setSigningOut(false);
      toast({ title: t.shell.signOutFailed, description: errorMessage(error), variant: "error" });
      return null;
    });
    if (!signedOut) return;
    patchMe({ user: null, usage: null, period: null });
    toast({ title: t.shell.signedOut, description: signedOutNote(signedOut.kept) });
    void refreshMe();
  }

  return (
    <Menu
      label={t.shell.accountMenu}
      triggerLabel={fmt(t.shell.accountMenuFor, { email: user.email })}
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
            <span className="block truncate text-xs/4 text-subtle">{planLine(user, t)}</span>
          </span>
          {signingOut ? (
            <Spinner className="text-muted" />
          ) : (
            <ChevronsUpDown aria-hidden className="size-4 shrink-0 text-muted" />
          )}
        </>
      }
      items={[
        ...(upgrade
          ? [
              { label: upgrade.label, icon: CircleArrowUp, onSelect: upgrade.open },
              "separator" as const,
            ]
          : []),
        {
          label: t.shell.search,
          icon: Search,
          shortcut: shortcut || undefined,
          onSelect: openCommandPalette,
        },
        {
          label: t.shell.account,
          icon: UserRound,
          onSelect: () => router.push(ROUTES.dashboardAccount),
        },
        {
          label: t.shell.workRights,
          icon: SlidersHorizontal,
          onSelect: () => router.push(accountSectionHref("work")),
        },
        {
          label: t.shell.pricing,
          icon: CreditCard,
          onSelect: () => router.push(ROUTES.pricing),
        },
        {
          label: fmt(t.shell.help, { email: BRAND.supportEmail }),
          icon: LifeBuoy,
          onSelect: () => window.location.assign(`mailto:${BRAND.supportEmail}`),
        },
        "separator",
        {
          label: signingOut ? t.shell.signingOut : t.shell.signOut,
          icon: LogOut,
          disabled: signingOut,
          onSelect: () => void signOut(),
        },
      ]}
    />
  );
}
