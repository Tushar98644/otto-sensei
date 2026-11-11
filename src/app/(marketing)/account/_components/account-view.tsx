"use client";

import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import { ACCOUNT_OTTO } from "@/components/account/copy";
import { SignInForm } from "@/components/account/sign-in-form";
import { UpgradeDialog } from "@/components/account/upgrade-dialog";
import { useBillingRedirect } from "@/components/account/use-billing-redirect";
import { useMe } from "@/components/account/use-me";
import { useOttoLoadingScreen } from "@/components/mascot/otto-loading-screen";
import { WorkProfileCard } from "@/components/eligibility/work-profile-card";
import { OttoNote } from "@/components/mascot/otto-note";
import { ReminderSettingsCard } from "@/components/notifications/reminder-settings-card";
import { LookingForSettingsCard } from "@/components/setup/looking-for-settings-card";
import { useScrollToSection } from "@/components/setup/use-scroll-to-section";
import { InviteCard } from "@/components/referrals/invite-card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Spinner } from "@/components/ui/spinner";
import { nextPlan, PLAN_ORDER, PLANS, type PaidPlanId, type PlanId } from "@/config/plans";
import { AccountSkeleton } from "./account-skeleton";
import { DeleteAccountCard } from "./delete-account-card";
import { BillingCard, UpgradeCard } from "./plan-cards";
import { ProfileCard } from "./profile-card";
import { UpgradeStatus } from "./upgrade-status";
import { useAccountArrival } from "./use-account-arrival";
import { useUpgradeWatch } from "./use-upgrade-watch";
import { UsageCard } from "./usage-card";

const above = (plan: PlanId, target: PlanId) => PLAN_ORDER.indexOf(target) > PLAN_ORDER.indexOf(plan);

// Back from checkout, the full-screen wait covers the first few plan checks (about 10s, at 2s, 5s
// and 10s). A slower webhook gets the page and its "Finishing your upgrade" note instead.
const ACTIVATION_SCREEN_MS = 10_000;

export function AccountView() {
  const { me, user, loading, refresh } = useMe();
  const arrival = useAccountArrival();
  const [upgradeRequested, setUpgradeRequested] = useState(arrival.upgrade);
  const checkout = useBillingRedirect("checkout");
  const backFromCheckout = arrival.checkout === "success";
  const bought = arrival.plan;
  const watch = useUpgradeWatch(
    backFromCheckout && user !== null && (bought ? above(user.plan, bought) : user.plan === "free"),
  );
  const [patient, setPatient] = useState(true);
  useEffect(() => {
    if (!backFromCheckout) return;
    const timer = window.setTimeout(() => setPatient(false), ACTIVATION_SCREEN_MS);
    return () => window.clearTimeout(timer);
  }, [backFromCheckout]);
  useOttoLoadingScreen(
    backFromCheckout && patient && (loading || watch.state === "checking"),
    bought ? `Setting up your ${PLANS[bought].name} plan` : "Setting up your new plan",
  );
  // The plan a pricing link asked for, else the next one up; null when there's nothing above.
  const wanted: PaidPlanId | null = arrival.plan ?? nextPlan(user?.plan ?? "free");
  const wantsUpgrade = upgradeRequested && !loading && wanted !== null && above(user?.plan ?? "free", wanted);
  const offered = wanted !== null && (me?.billing.offer[wanted].length ?? 0) > 0;
  // One step from the pricing page: someone signed in goes straight to checkout. The dialog is for
  // signing in first, or for when payments aren't on.
  const straightToCheckout = wantsUpgrade && user !== null && me?.billing.mode !== "disabled" && offered;
  const upgradeOpen = wantsUpgrade && !straightToCheckout;

  // Setup links (#work-profile, #looking-for, #reminders) land on their card once it exists.
  useScrollToSection(!loading && user !== null);

  const started = useRef(false);
  const startCheckout = useEffectEvent(() => {
    if (wanted) void checkout.go(wanted, arrival.interval ?? "month");
  });
  useEffect(() => {
    if (!straightToCheckout || started.current) return;
    started.current = true;
    const timer = window.setTimeout(startCheckout, 0);
    return () => window.clearTimeout(timer);
  }, [straightToCheckout]);

  let content: ReactNode;
  if (loading) {
    content = <AccountSkeleton />;
  } else if (!me) {
    content = (
      <Alert
        variant="error"
        title="Couldn't load your account"
        action={
          <Button variant="outline" onClick={() => void refresh()}>
            Try again
          </Button>
        }
      >
        Check your connection, then try again.
      </Alert>
    );
  } else if (!user) {
    content = (
      <Card className="gap-6 sm:gap-6">
        <OttoNote live={false} message={ACCOUNT_OTTO.signedOut} />
        <SignInForm />
      </Card>
    );
  } else {
    const paid = user.plan !== "free";
    content = (
      <div className="flex flex-col gap-3">
        {straightToCheckout && checkout.pending && wanted ? (
          <p role="status" className="flex items-center gap-2 text-sm text-muted">
            <Spinner />
            Taking you to checkout for {PLANS[wanted].name}
          </p>
        ) : null}
        {backFromCheckout ? (
          <UpgradeStatus plan={user.plan} trialEndsAt={user.trialEndsAt} target={bought} watch={watch} />
        ) : null}
        <ProfileCard user={user} />
        {/* Job-search settings first (owner, 2026-11-11): they change what every page shows. */}
        <Eyebrow className="mt-3 px-1">Your job search</Eyebrow>
        <WorkProfileCard />
        <LookingForSettingsCard />
        <ReminderSettingsCard />
        <Eyebrow className="mt-3 px-1">Plan and account</Eyebrow>
        <UsageCard me={me} plan={user.plan} />
        {user.plan === "max" ? null : (
          <UpgradeCard
            plan={user.plan}
            interval={user.planInterval}
            mode={me.billing.mode}
            offer={me.billing.offer}
            trial={me.billing.trial === true}
          />
        )}
        {paid ? <BillingCard mode={me.billing.mode} trialEndsAt={user.trialEndsAt ?? null} /> : null}
        <InviteCard plan={user.plan} />
        {/* Last, so the one thing that can't be undone never sits between everyday settings. */}
        <DeleteAccountCard isPro={paid} />
      </div>
    );
  }

  return (
    <>
      {content}
      {/* Kept outside the branches above: signing in inside it swaps the page content, and it must
          stay mounted to carry on to checkout. */}
      <UpgradeDialog
        open={upgradeOpen}
        plan={arrival.plan ?? undefined}
        interval={arrival.interval ?? undefined}
        onOpenChange={(open) => {
          if (!open) setUpgradeRequested(false);
        }}
      />
    </>
  );
}
