"use client";

import { ArrowLeft } from "lucide-react";
import { useState, type ReactNode } from "react";
import { OTTO } from "@/components/mascot/lines";
import { OttoNote } from "@/components/mascot/otto-note";
import { upgradeHref } from "@/components/site/routes";
import { Button, buttonClasses } from "@/components/ui/button";
import { Dialog, type DialogSize } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import {
  nextPlan,
  PLAN_ORDER,
  PLANS,
  type BillingInterval,
  type Feature,
  type PaidPlanId,
  type PlanId,
  type ProTool,
} from "@/config/plans";
import type { SessionUser } from "@/lib/auth/types";
import { trialHeadline } from "@/lib/billing/prices";
import { resetWhen, thisPeriod } from "@/lib/usage-copy";
import { BillingNote } from "./billing-note";
import { ACCOUNT_OTTO, SUPPORT_MAILTO } from "./copy";
import { PlanOffer } from "./plan-offer";
import { SignInForm } from "./sign-in-form";
import { upgradeOffer } from "./upgrade-offer";
import { useBillingRedirect } from "./use-billing-redirect";
import { useMe } from "./use-me";

export type UpgradeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // The allowance that ran out, for the copy ("You've used this month's 60 tailored versions").
  feature?: Feature;
  // Or the Pro tool a Free account reached for (a second resume, a Pro format, Word, ...).
  tool?: ProTool;
  // What the pricing page asked for: focused first, and priced for that billing option.
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
  size?: DialogSize;
};

const rank = (plan: PlanId) => PLAN_ORDER.indexOf(plan);

// Pitch, then checkout in one click. Free sees Pro and Max side by side (Pro monthly is the free
// trial for anyone who hasn't had one), Pro sees Max next to its own plan, and Max has nothing
// above it. Signed-out users sign in inside the dialog first and go straight on to checkout, so
// there's never a second dialog on top of this one.
export function UpgradeDialog({
  open,
  onOpenChange,
  feature,
  tool,
  plan,
  interval,
}: UpgradeDialogProps) {
  const { me, user, loading } = useMe();
  const checkout = useBillingRedirect("checkout");
  const [stage, setStage] = useState<Stage>("pitch");
  // The plan last chosen, kept through signing in.
  const [chosen, setChosen] = useState<PaidPlanId | null>(plan ?? null);
  const [pickedInterval, setPickedInterval] = useState<BillingInterval | null>(interval ?? null);
  // Each opening starts at the pitch, even if the last one was closed halfway through signing in.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setStage("pitch");
  }

  const mode = me?.billing.mode;
  const current: PlanId = user?.plan ?? "free";
  // Signed out counts as new: a new account gets the trial when it's on sale here.
  const trialOnOffer = current === "free" && me?.billing.trial === true;
  const offer = upgradeOffer({
    current,
    // Before /api/me answers, assume only what every server sells.
    offer: me?.billing.offer ?? { pro: ["month"], max: [] },
    // Until one is picked, a subscriber is offered their own billing interval.
    picked: pickedInterval ?? user?.planInterval ?? "month",
    trial: trialOnOffer,
  });
  const buyable = offer.cards.filter((card) => !card.current);
  // The card to start on and to carry on with after signing in: the plan chosen or asked for,
  // else the next one up.
  const target =
    buyable.find((card) => card.plan === chosen) ??
    buyable.find((card) => card.plan === nextPlan(current)) ??
    buyable[0] ??
    null;
  const period = me?.period;
  // Free has none of the AI features or Pro tools, so there is no limit to talk about, only what
  // Pro adds.
  let limitLine: string | null = null;
  if (tool && current === "free") limitLine = OTTO.limit.tool(tool, trialOnOffer);
  else if (feature) {
    limitLine =
      current === "free"
        ? OTTO.limit.none(feature, trialOnOffer)
        : OTTO.limit.reached(feature, me?.usage?.[feature].limit, period);
  }
  const close = () => onOpenChange(false);

  function choose(card: { plan: PaidPlanId; interval: BillingInterval }) {
    setChosen(card.plan);
    if (user) void checkout.go(card.plan, card.interval);
    else setStage("sign-in");
  }

  function handleSignedIn(signedIn: SessionUser) {
    setStage("pitch");
    if (!target || rank(signedIn.plan) >= rank(target.plan)) {
      toast({ title: `You're already on ${PLANS[signedIn.plan].name}.`, variant: "success" });
      close();
      return;
    }
    void checkout.go(target.plan, target.interval);
  }

  const billingOff = mode === "disabled";
  const pitch = (
    <div className="flex flex-col gap-4">
      <PlanOffer
        cards={offer.cards}
        intervals={offer.intervals}
        interval={offer.interval}
        onIntervalChange={setPickedInterval}
        onChoose={billingOff ? undefined : choose}
        focusPlan={target?.plan}
        pendingPlan={checkout.pending ? (chosen ?? target?.plan ?? null) : null}
        disabled={loading}
      />
      <BillingNote mode={mode} />
    </div>
  );
  // Two plans side by side need the wide dialog; one fits the narrow one.
  const size: DialogSize = offer.cards.length > 1 ? "lg" : "sm";
  const notNow = (
    <Button variant="outline" onClick={close}>
      Not now
    </Button>
  );

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
        ? `It resets ${resetWhen(period)}. Need more before then? Email us.`
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
  } else if (stage === "sign-in" && !user && !billingOff) {
    view = {
      message: ACCOUNT_OTTO.upgradeSignIn,
      title: target.trial ? "Sign in to start your trial" : "Sign in to upgrade",
      description: "Use Google or a 6-digit email code. No password.",
      // Google leaves the page, so it comes back to the account page with the upgrade flow open.
      body: (
        <SignInForm
          autoFocus
          next={upgradeHref(target.plan, target.interval)}
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
    const upgrading = current !== "free";
    view = {
      message: billingOff
        ? (limitLine ?? ACCOUNT_OTTO.billingOff)
        : limitLine && upgrading
          ? `${limitLine} ${PLANS[target.plan].name} has more.`
          : (limitLine ?? (target.trial ? OTTO.upgrade.trial : ACCOUNT_OTTO.upgradePitch)),
      title: upgrading
        ? `Upgrade to ${PLANS[target.plan].name}`
        : offer.cards.length > 1
          ? "Choose your plan"
          : target.trial
            ? trialHeadline()
            : `Upgrade to ${PLANS[target.plan].name}`,
      description: upgrading
        ? "Your subscription changes in place: you pay only the difference, never twice."
        : "Cancel anytime from your account.",
      body: pitch,
      size,
      footer: billingOff ? (
        <>
          <Button variant="outline" onClick={close}>
            Close
          </Button>
          <a href={SUPPORT_MAILTO} className={buttonClasses()} data-autofocus>
            Email us
          </a>
        </>
      ) : (
        notNow
      ),
    };
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size={view.size ?? "sm"}
      title={view.title}
      description={view.description}
      illustration={<OttoNote size="sm" message={view.message} />}
      footer={view.footer}
    >
      {view.body}
    </Dialog>
  );
}
