"use client";

import { ArrowLeft } from "lucide-react";
import { useState, type ReactNode } from "react";
import { OTTO } from "@/components/mascot/lines";
import { OttoNote } from "@/components/mascot/otto-note";
import { upgradeHref } from "@/components/site/routes";
import { Button, buttonClasses } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import {
  nextPlan,
  PAID_PLANS,
  PLAN_ORDER,
  PLANS,
  type BillingInterval,
  type Feature,
  type PaidPlanId,
  type PlanId,
} from "@/config/plans";
import type { SessionUser } from "@/lib/auth/types";
import { planPriceLabel } from "@/lib/billing/prices";
import { resetDay, thisPeriod } from "@/lib/usage-copy";
import { BillingNote } from "./billing-note";
import { ACCOUNT_OTTO, SUPPORT_MAILTO } from "./copy";
import { IntervalPicker } from "./interval-picker";
import { PlanPicker } from "./plan-picker";
import { PlanPerks } from "./pro-perks";
import { SignInForm } from "./sign-in-form";
import { useBillingRedirect } from "./use-billing-redirect";
import { useMe } from "./use-me";

export type UpgradeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // The allowance that ran out, for the copy ("You've used all 3 tailored versions for this month").
  feature?: Feature;
  // What the pricing page asked for; otherwise the next plan up.
  plan?: PaidPlanId;
  interval?: BillingInterval;
};

type Stage = "pitch" | "sign-in";

type View = {
  message: string;
  title: string;
  description?: string;
  body?: ReactNode;
  footer: ReactNode;
};

const rank = (plan: PlanId) => PLAN_ORDER.indexOf(plan);

// Pitch, then checkout in one click. It offers the next plan up (Free to Pro, Pro to Max), with
// the other one a tap away. Signed-out users sign in inside the dialog first and go straight on to
// checkout, so there's never a second dialog on top of this one.
export function UpgradeDialog({ open, onOpenChange, feature, plan, interval }: UpgradeDialogProps) {
  const { me, user, loading } = useMe();
  const checkout = useBillingRedirect("checkout");
  const [stage, setStage] = useState<Stage>("pitch");
  const [pickedPlan, setPickedPlan] = useState<PaidPlanId | null>(plan ?? null);
  const [pickedInterval, setPickedInterval] = useState<BillingInterval | null>(interval ?? null);
  // Each opening starts at the pitch, even if the last one was closed halfway through signing in.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setStage("pitch");
  }

  const mode = me?.billing.mode;
  const current: PlanId = user?.plan ?? "free";
  // Before /api/me answers, assume only what every server sells.
  const offer = me?.billing.offer ?? { pro: ["month"], max: [] };
  // Plans above the current one that are on sale here.
  const above = PAID_PLANS.filter(
    (candidate) => rank(candidate) > rank(current) && offer[candidate].length > 0,
  );
  const suggested = nextPlan(current);
  const target: PaidPlanId | null =
    pickedPlan && above.includes(pickedPlan)
      ? pickedPlan
      : suggested && above.includes(suggested)
        ? suggested
        : (above[0] ?? null);
  const intervals = target ? offer[target] : undefined;
  // Until one is picked, a subscriber is offered their own billing interval. A pick from before the
  // offer changed falls back to monthly.
  const wantedInterval = pickedInterval ?? user?.planInterval ?? "month";
  const chosenInterval: BillingInterval = intervals?.includes(wantedInterval)
    ? wantedInterval
    : (intervals?.[0] ?? "month");
  const period = me?.period;
  const limitLine = feature ? OTTO.limit.reached(feature, me?.usage?.[feature].limit, period) : null;
  const close = () => onOpenChange(false);

  function startUpgrade() {
    if (!target) return;
    if (user) void checkout.go(target, chosenInterval);
    else setStage("sign-in");
  }

  function handleSignedIn(signedIn: SessionUser) {
    setStage("pitch");
    if (!target || rank(signedIn.plan) >= rank(target)) {
      toast({ title: `You're already on ${PLANS[signedIn.plan].name}.`, variant: "success" });
      close();
      return;
    }
    void checkout.go(target, chosenInterval);
  }

  const pitch = target ? (
    <div className="flex flex-col gap-4">
      {mode === "disabled" ? null : (
        <>
          <PlanPicker plans={above} value={target} onChange={setPickedPlan} />
          <IntervalPicker
            plan={target}
            intervals={intervals}
            value={chosenInterval}
            onChange={setPickedInterval}
          />
        </>
      )}
      <PlanPerks plan={target} interval={chosenInterval} />
      <BillingNote mode={mode} />
    </div>
  ) : null;

  let view: View;
  if (!target) {
    // Already on the top plan on sale: nothing to sell, so offer a person.
    view = {
      message:
        limitLine ??
        (current === "max"
          ? ACCOUNT_OTTO.alreadyMax
          : `You're on ${PLANS[current].name}, the biggest plan on sale here. Email us if you need more.`),
      title: feature ? `You've reached ${thisPeriod(period)}'s limit` : `You're on ${PLANS[current].name}`,
      description: feature
        ? `It resets on ${resetDay(period)}. Need more before then? Email us.`
        : undefined,
      footer: (
        <>
          <Button variant="outline" onClick={close}>
            Close
          </Button>
          <a href={SUPPORT_MAILTO} className={buttonClasses()}>
            Email us
          </a>
        </>
      ),
    };
  } else if (mode === "disabled") {
    view = {
      message: limitLine ?? ACCOUNT_OTTO.billingOff,
      title: `Upgrade to ${PLANS[target].name}`,
      description: `${planPriceLabel(target, "month")}. Cancel anytime.`,
      body: pitch,
      footer: (
        <>
          <Button variant="outline" onClick={close}>
            Close
          </Button>
          <a href={SUPPORT_MAILTO} className={buttonClasses()} data-autofocus>
            Email us
          </a>
        </>
      ),
    };
  } else if (stage === "sign-in" && !user) {
    view = {
      message: ACCOUNT_OTTO.upgradeSignIn,
      title: "Sign in to upgrade",
      description: "Use Google or a 6-digit email code. No password.",
      // Google leaves the page, so it comes back to the account page with the upgrade flow open.
      body: (
        <SignInForm
          autoFocus
          next={upgradeHref(target, chosenInterval)}
          onSignedIn={handleSignedIn}
        />
      ),
      footer: (
        <Button variant="ghost" onClick={() => setStage("pitch")}>
          <ArrowLeft />
          Back
        </Button>
      ),
    };
  } else {
    const name = PLANS[target].name;
    view = {
      message: limitLine ? `${limitLine} ${name} has more.` : ACCOUNT_OTTO.upgradePitch,
      title: `Upgrade to ${name}`,
      description: `${planPriceLabel(target, chosenInterval)}. Cancel anytime.`,
      body: pitch,
      footer: (
        <>
          <Button variant="outline" onClick={close}>
            Not now
          </Button>
          {/* data-autofocus picks it on open; autoFocus when coming back from the sign-in step. */}
          <Button
            onClick={startUpgrade}
            loading={checkout.pending}
            disabled={loading}
            autoFocus
            data-autofocus
          >
            Upgrade to {name}
          </Button>
        </>
      ),
    };
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title={view.title}
      description={view.description}
      illustration={<OttoNote size="sm" message={view.message} />}
      footer={view.footer}
    >
      {view.body}
    </Dialog>
  );
}
