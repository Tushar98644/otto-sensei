"use client";

import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import { alreadyOnPlanToast, backFromUpgradeToast } from "@/components/account/copy";
import { LazyUpgradeDialog } from "@/components/account/lazy-dialogs";
import { useBillingRedirect } from "@/components/account/use-billing-redirect";
import { useMe } from "@/components/account/use-me";
import { useOttoLoadingScreen } from "@/components/mascot/otto-loading-screen";
import { useScrollToSection } from "@/components/setup/use-scroll-to-section";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { nextPlan, PLAN_ORDER, PLANS, type PaidPlanId, type PlanId } from "@/config/plans";
import { AccountSignIn } from "./account-sign-in";
import { AccountSkeleton } from "./account-skeleton";
import { AccountTabs } from "./account-tabs";
import { UpgradeStatus } from "./upgrade-status";
import { useAccountArrival } from "./use-account-arrival";
import { useUpgradeReturn } from "./use-upgrade-return";
import { planArrived, useUpgradeWatch } from "./use-upgrade-watch";

const above = (plan: PlanId, target: PlanId) =>
  PLAN_ORDER.indexOf(target) > PLAN_ORDER.indexOf(plan);

const ACTIVATION_SCREEN_MS = 10_000;

export function AccountView() {
  const { me, user, loading, refresh } = useMe();
  const arrival = useAccountArrival();
  const [upgradeRequested, setUpgradeRequested] = useState(arrival.upgrade);
  // A sign-in in the dialog goes on to checkout from there, so the page doesn't start a second one.
  const [checkoutFromPage, setCheckoutFromPage] = useState<boolean | null>(null);
  if (checkoutFromPage === null && !loading && me) setCheckoutFromPage(user !== null);
  const checkout = useBillingRedirect("checkout");
  const backFromCheckout = arrival.checkout === "success";
  const bought = arrival.plan;
  const arrivedPlan = backFromCheckout && user && planArrived(user.plan, bought) ? user.plan : null;
  const watch = useUpgradeWatch(backFromCheckout && user !== null && arrivedPlan === null);
  const goingBack = arrivedPlan !== null && arrival.next !== null;
  const [patient, setPatient] = useState(true);
  useEffect(() => {
    if (!backFromCheckout) return;
    const timer = window.setTimeout(() => setPatient(false), ACTIVATION_SCREEN_MS);
    return () => window.clearTimeout(timer);
  }, [backFromCheckout]);
  useOttoLoadingScreen(
    backFromCheckout && patient && (loading || watch.state === "checking" || goingBack),
    bought ? `Setting up your ${PLANS[bought].name} plan` : "Setting up your new plan",
  );
  const wanted: PaidPlanId | null = arrival.plan ?? nextPlan(user?.plan ?? "free");
  const alreadyOn = arrival.upgrade && user && planArrived(user.plan, wanted) ? user.plan : null;
  useUpgradeReturn(
    arrival.next,
    arrivedPlan
      ? backFromUpgradeToast(PLANS[arrivedPlan].name)
      : alreadyOn
        ? alreadyOnPlanToast(PLANS[alreadyOn].name)
        : null,
  );
  const wantsUpgrade =
    upgradeRequested && !loading && wanted !== null && above(user?.plan ?? "free", wanted);
  const offered = wanted !== null && (me?.billing.offer[wanted].length ?? 0) > 0;
  // A held or ending subscription can't be upgraded, so the dialog points to Manage billing instead.
  const portalFirst = me?.billing.paymentIssue === true || me?.billing.cancelScheduled === true;
  // Only Free skips the dialog: Dodo's hosted checkout is its confirmation, while a paid plan is charged in place.
  const straightToCheckout =
    wantsUpgrade &&
    user?.plan === "free" &&
    me?.billing.mode !== "disabled" &&
    offered &&
    !portalFirst &&
    checkoutFromPage === true;
  const upgradeOpen = wantsUpgrade && !straightToCheckout;
  const checkingOut = straightToCheckout && checkout.pending ? wanted : null;

  useScrollToSection(!loading && user !== null);

  const started = useRef(false);
  const startCheckout = useEffectEvent(() => {
    if (wanted) void checkout.go(wanted, arrival.interval ?? "month", arrival.next);
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
      <AccountSignIn
        billing={me.billing}
        plan={arrival.upgrade ? wanted : null}
        interval={arrival.interval}
        next={arrival.next}
        autoFocus={!upgradeOpen}
        onSignedIn={() => {
          setCheckoutFromPage(true);
          setUpgradeRequested(arrival.upgrade);
        }}
      />
    );
  } else {
    content = (
      <AccountTabs
        me={me}
        user={user}
        notice={
          checkingOut || backFromCheckout ? (
            <div className="flex flex-col gap-3">
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
                  next={arrival.next}
                />
              ) : null}
            </div>
          ) : null
        }
      />
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
        next={arrival.next}
        startAtSignIn={!user && arrival.plan !== null}
        onOpenChange={(open) => {
          if (!open) setUpgradeRequested(false);
        }}
      />
    </>
  );
}
