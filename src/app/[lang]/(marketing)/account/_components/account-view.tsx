"use client";

import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import { LazyUpgradeDialog } from "@/components/account/lazy-dialogs";
import { useBillingRedirect } from "@/components/account/use-billing-redirect";
import { useMe } from "@/components/account/use-me";
import { useOttoLoadingScreen } from "@/components/mascot/otto-loading-screen";
import { useScrollToSection } from "@/components/setup/use-scroll-to-section";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { nextPlan, PLAN_ORDER, PLANS, type PaidPlanId, type PlanId } from "@/config/plans";
import { useMessages, useMessagesOr } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import EN_UPGRADE from "@/i18n/messages/en/upgrade";
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
  const words = useMessages("account");
  const upgradeToasts = useMessagesOr("upgrade", EN_UPGRADE).toast;
  const { me, user, loading, refresh } = useMe();
  const arrival = useAccountArrival(words.arrival);
  const [upgradeRequested, setUpgradeRequested] = useState(arrival.upgrade);
  // Decided on the first settled read, a failed one too: a sign-in in the dialog goes on to checkout from there, so the page doesn't start a second one.
  const [checkoutFromPage, setCheckoutFromPage] = useState<boolean | null>(null);
  if (checkoutFromPage === null && !loading) setCheckoutFromPage(user !== null);
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
    bought ? fmt(words.view.settingUp, { plan: PLANS[bought].name }) : words.view.settingUpNew,
  );
  const wanted: PaidPlanId | null = arrival.plan ?? nextPlan(user?.plan ?? "free");
  const alreadyOn = arrival.upgrade && user && planArrived(user.plan, wanted) ? user.plan : null;
  useUpgradeReturn(
    arrival.next,
    arrivedPlan
      ? fmt(upgradeToasts.backOn, { plan: PLANS[arrivedPlan].name })
      : alreadyOn
        ? fmt(upgradeToasts.alreadyOn, { plan: PLANS[alreadyOn].name })
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
    content = <AccountSkeleton words={words.skeleton} />;
  } else if (!me) {
    content = (
      <Alert
        data-narrow
        variant="error"
        title={words.view.loadFailed}
        action={
          <Button variant="secondary" onClick={() => void refresh()}>
            {words.tryAgain}
          </Button>
        }
      >
        {words.checkConnection}
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
                  {fmt(words.view.checkout, { plan: PLANS[checkingOut].name })}
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
