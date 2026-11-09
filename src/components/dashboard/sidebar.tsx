"use client";

import { ChevronsUpDown, CreditCard, LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { signedOutNote } from "@/components/account/copy";
import { errorMessage } from "@/components/account/errors";
import { nearestLimit } from "@/components/account/near-limit";
import { PlanBadge } from "@/components/account/plan-badge";
import { useProTools } from "@/components/account/pro-tools";
import { UpgradeDialog } from "@/components/account/upgrade-dialog";
import { patchMe, refreshMe, type Me } from "@/components/account/use-me";
import { FeedbackButton } from "@/components/feedback/feedback-button";
import { OTTO } from "@/components/mascot/lines";
import { OttoNote } from "@/components/mascot/otto-note";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { OttoMark } from "@/components/site/otto-mark";
import { ROUTES } from "@/components/site/routes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Menu } from "@/components/ui/menu";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { BRAND } from "@/config/brand";
import { nextPlan, PLANS, type Feature } from "@/config/plans";
import type { SessionUser } from "@/lib/auth/types";
import { trialHeadline } from "@/lib/billing/prices";
import { useStudioStore } from "@/lib/store/resume-store";
import { signOutAndRelease } from "@/lib/sync/use-cloud-sync";
import { trialEndDay } from "@/lib/usage-copy";
import { cn } from "@/lib/utils";
import { NewResumeMenu } from "./new-resume-menu";
import { APP_NAV, APP_NAV_FOOTER, isCurrent, showsProBadge, type AppNavItem } from "./nav";
import type { StudioActions } from "./use-studio-actions";

const count = new Intl.NumberFormat("en-US");

// Desktop navigation: logo, the one "new" control, the sections, then the plan and the account at
// the bottom, so "where am I and am I signed in" is always answered on the left.
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
            pathname={pathname}
            proBadge={showsProBadge(item, proTools)}
            count={item.href === ROUTES.dashboardResumes && resumeCount > 0 ? resumeCount : null}
          />
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-2 pt-6">
        <nav aria-label="Trash and account" className="flex flex-col gap-0.5">
          {APP_NAV_FOOTER.map((item) => (
            <SidebarLink key={item.href} item={item} pathname={pathname} proBadge={false} count={null} />
          ))}
        </nav>
        <FeedbackButton />
        {/* The account page's usage card gives the same warning, for every meter. */}
        <PlanBox user={user} me={me} warn={pathname !== ROUTES.dashboardAccount} />
        <AccountRow user={user} />
      </div>
    </aside>
  );
}

function SidebarLink({
  item,
  pathname,
  proBadge,
  count: total,
}: {
  item: AppNavItem;
  pathname: string;
  proBadge: boolean;
  count: number | null;
}) {
  const current = isCurrent(item, pathname);
  return (
    <Link
      href={item.href}
      aria-current={current ? "page" : undefined}
      data-tour={item.href === ROUTES.dashboardResumes ? "dashboard-library" : undefined}
      className={cn(
        "flex h-9 shrink-0 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-colors",
        current
          ? "bg-surface text-ink shadow-control ring-1 ring-ink/5"
          : "text-muted hover:bg-ink/5 hover:text-ink",
      )}
    >
      <item.icon className={cn("size-4", current ? "text-ink" : "text-muted")} aria-hidden />
      <span className="flex-1">{item.label}</span>
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

// The three allowances people spend most; the Account page lists all of them.
const SLIP_FEATURES = [
  { feature: "tailor", label: "Tailored versions" },
  { feature: "letter", label: "Letters, answers, prep" },
  { feature: "fix", label: "Line fixes" },
] as const satisfies readonly { feature: Feature; label: string }[];

// The plan as a small slip: what you're on, what's left this month (or week, or trial), and the
// one way up. Free has no AI meters, so it says what Pro adds instead.
function PlanBox({ user, me, warn }: { user: SessionUser; me: Me | null; warn: boolean }) {
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const usage = me?.usage;
  const next = nextPlan(user.plan);
  const nextOnSale = next !== null && (me?.billing.offer[next].length ?? 0) > 0;
  const near = warn ? nearestLimit(usage, SLIP_FEATURES.map(({ feature }) => feature)) : null;
  const free = user.plan === "free";
  const trialOffer = free && me?.billing.trial === true;

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-surface p-3.5 ring-1 ring-ink/5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs/4 font-medium tracking-widest text-subtle uppercase">Plan</span>
        <PlanBadge plan={user.plan} />
      </div>
      {user.plan !== "free" && user.trialEndsAt ? (
        <p className="text-xs/4 text-muted">Free trial until {trialEndDay(user.trialEndsAt)}</p>
      ) : null}
      {free ? (
        <p className="text-sm/5 text-muted">Otto&apos;s AI help and portfolios come with Pro.</p>
      ) : usage ? (
        <div className="flex flex-col gap-2.5">
          {SLIP_FEATURES.map(({ feature, label }) =>
            // A server from before a feature existed sends no count for it.
            usage[feature] ? (
              <Progress
                key={feature}
                size="sm"
                label={label}
                value={usage[feature].used}
                max={usage[feature].limit}
                valueText={`${count.format(usage[feature].used)} of ${count.format(usage[feature].limit)}`}
              />
            ) : null,
          )}
        </div>
      ) : (
        <div aria-hidden className="flex flex-col gap-2.5">
          <div className="h-8 rounded-md bg-surface-muted" />
          <div className="h-8 rounded-md bg-surface-muted" />
          <div className="h-8 rounded-md bg-surface-muted" />
        </div>
      )}
      {near ? (
        <OttoNote
          size="sm"
          live={false}
          message={OTTO.limit.near(near.feature, near.used, near.limit, me?.period)}
        />
      ) : null}
      {next && nextOnSale ? (
        <>
          <Button size="sm" variant="secondary" className="w-full" onClick={() => setUpgradeOpen(true)}>
            {trialOffer ? trialHeadline() : `Upgrade to ${PLANS[next].name}`}
          </Button>
          <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
        </>
      ) : null}
    </div>
  );
}

function AccountRow({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    // Also takes the account's backed-up resumes out of this browser, for shared computers.
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
    <Menu
      label="Account"
      triggerLabel={`Account menu for ${user.email}`}
      triggerClassName="flex h-12 w-full items-center gap-2.5 rounded-lg px-2 text-left transition-colors hover:bg-ink/5 aria-expanded:bg-ink/5"
      className="w-56"
      trigger={
        <>
          <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-white uppercase"
          >
            {user.email.trim().charAt(0)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs/4 text-subtle">Signed in as</span>
            <span className="block truncate text-sm/5 font-medium text-ink">{user.email}</span>
          </span>
          {signingOut ? (
            <Spinner className="text-muted" />
          ) : (
            <ChevronsUpDown aria-hidden className="size-4 shrink-0 text-muted" />
          )}
        </>
      }
      items={[
        {
          label: "Account",
          icon: UserRound,
          onSelect: () => router.push(ROUTES.dashboardAccount),
        },
        {
          label: "Plans and pricing",
          icon: CreditCard,
          onSelect: () => router.push(ROUTES.pricing),
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
  );
}
