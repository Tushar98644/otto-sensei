"use client";

import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import { ACCOUNT_OTTO } from "@/components/account/copy";
import { LazyUpgradeDialog } from "@/components/account/lazy-dialogs";
import { SignInForm } from "@/components/account/sign-in-form";
import { useBillingRedirect } from "@/components/account/use-billing-redirect";
import { useMe } from "@/components/account/use-me";
import { useOttoLoadingScreen } from "@/components/mascot/otto-loading-screen";
import { WorkProfileCard } from "@/components/eligibility/work-profile-card";
import { OttoNote } from "@/components/mascot/otto-note";
import { ReminderSettingsCard } from "@/components/notifications/reminder-settings-card";
import { InviteCard } from "@/components/referrals/invite-card";
import { SectionNav } from "@/components/settings/section-nav";
import {
  accountSections,
  SETTINGS_CONTENT,
  SETTINGS_LAYOUT,
  type AccountGroup,
} from "@/components/settings/sections";
import { SettingsGroup } from "@/components/settings/settings-group";
import { WritingStyleCard } from "@/components/settings/writing-style-card";
import { LookingForSettingsCard } from "@/components/setup/looking-for-settings-card";
import { useScrollToSection } from "@/components/setup/use-scroll-to-section";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

const above = (plan: PlanId, target: PlanId) =>
  PLAN_ORDER.indexOf(target) > PLAN_ORDER.indexOf(plan);

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
  const wanted: PaidPlanId | null = arrival.plan ?? nextPlan(user?.plan ?? "free");
  const wantsUpgrade =
    upgradeRequested && !loading && wanted !== null && above(user?.plan ?? "free", wanted);
  const offered = wanted !== null && (me?.billing.offer[wanted].length ?? 0) > 0;
  const straightToCheckout =
    wantsUpgrade && user !== null && me?.billing.mode !== "disabled" && offered;
  const upgradeOpen = wantsUpgrade && !straightToCheckout;
  const checkingOut = straightToCheckout && checkout.pending ? wanted : null;

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
        data-narrow
        variant="error"
        title="Couldn't load your account"
        action={
          <Button variant="secondary" onClick={() => void refresh()}>
            Try again
          </Button>
        }
      >
        Check your connection, then try again.
      </Alert>
    );
  } else if (!user) {
    content = (
      <Card data-narrow className="gap-6 sm:gap-6">
        <OttoNote live={false} message={ACCOUNT_OTTO.signedOut} />
        <SignInForm />
      </Card>
    );
  } else {
    const paid = user.plan !== "free";
    const sections = accountSections({ paid });
    const groups: Record<AccountGroup, ReactNode> = {
      profile: <ProfileCard user={user} />,
      writingStyle: <WritingStyleCard />,
      jobSearch: (
        <>
          <WorkProfileCard />
          <LookingForSettingsCard />
        </>
      ),
      notifications: <ReminderSettingsCard />,
      plan: (
        <>
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
          {paid ? (
            <BillingCard mode={me.billing.mode} trialEndsAt={user.trialEndsAt ?? null} />
          ) : null}
        </>
      ),
      invite: <InviteCard plan={user.plan} />,
      danger: <DeleteAccountCard isPro={paid} />,
    };
    content = (
      <div className={SETTINGS_LAYOUT}>
        <SectionNav sections={sections} />
        <div className={SETTINGS_CONTENT}>
          {checkingOut || backFromCheckout ? (
            <div className="-mb-6 flex flex-col gap-3">
              {checkingOut ? (
                <p role="status" className="flex items-center gap-2 text-sm text-muted">
                  <Spinner />
                  Taking you to checkout for {PLANS[checkingOut].name}
                </p>
              ) : null}
              {backFromCheckout ? (
                <UpgradeStatus
                  plan={user.plan}
                  trialEndsAt={user.trialEndsAt}
                  target={bought}
                  watch={watch}
                />
              ) : null}
            </div>
          ) : null}
          {sections.map((section) => (
            <SettingsGroup key={section.id} section={section}>
              {groups[section.key]}
            </SettingsGroup>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {content}
      {/* Outside the branches: it must stay mounted through sign-in to reach checkout. */}
      <LazyUpgradeDialog
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
