"use client";

import { ArrowLeft, CreditCard } from "lucide-react";
import { useState, type ReactNode } from "react";
import { OTTO } from "@/components/mascot/lines";
import { OttoNote } from "@/components/mascot/otto-note";
import { upgradeHref } from "@/components/site/routes";
import { Button, buttonClasses } from "@/components/ui/button";
import { Dialog, type DialogSize } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import {
  isTrialing,
  nextPlan,
  planIncludes,
  PLANS,
  type BillingInterval,
  type Feature,
  type PaidPlanId,
  type PlanId,
  type ProTool,
} from "@/config/plans";
import type { SessionUser } from "@/lib/auth/types";
import { budgetReachedText } from "@/lib/ai-budget-copy";
import { trialHeadline } from "@/lib/billing/prices";
import { resetWhen, thisPeriod } from "@/lib/usage-copy";
import { BillingNote } from "./billing-note";
import { ACCOUNT_OTTO, SUPPORT_MAILTO } from "./copy";
import { PlanOffer } from "./plan-offer";
import { SignInForm } from "./sign-in-form";
import { PAYMENT_ISSUE_NOTICE, resumeFirstNotice, trialUpgradeNotice } from "./trial-upgrade";
import { afterUpgradeSignIn, upgradeOffer } from "./upgrade-offer";
import { useBillingRedirect } from "./use-billing-redirect";
import { useMe } from "./use-me";

export type UpgradeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: Feature;
  budget?: boolean;
  tool?: ProTool;
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

export function UpgradeDialog({
  open,
  onOpenChange,
  feature,
  budget = false,
  tool,
  plan,
  interval,
}: UpgradeDialogProps) {
  const { me, user, loading } = useMe();
  const checkout = useBillingRedirect("checkout");
  const portal = useBillingRedirect("portal");
  const [stage, setStage] = useState<Stage>("pitch");
  const [chosen, setChosen] = useState<PaidPlanId | null>(plan ?? null);
  const [pickedInterval, setPickedInterval] = useState<BillingInterval | null>(interval ?? null);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setStage("pitch");
  }

  const mode = me?.billing.mode;
  const current: PlanId = user?.plan ?? "free";
  const trialOnOffer = current === "free" && me?.billing.trial === true;
  const onTrial = user !== null && isTrialing(user);
  const paymentIssue = user !== null && me?.billing.paymentIssue === true;
  const resumeFirst = user !== null && current !== "free" && me?.billing.cancelScheduled === true;
  const offer = upgradeOffer({
    current,
    offer: me?.billing.offer ?? { pro: ["month"], max: [] },
    picked: pickedInterval ?? user?.planInterval ?? "month",
    trial: trialOnOffer,
    onTrial,
    currentInterval: user?.planInterval ?? null,
  });
  const buyable = offer.cards.filter((card) => !card.current);
  const target =
    buyable.find((card) => card.plan === chosen) ??
    buyable.find((card) => card.plan === nextPlan(current)) ??
    buyable[0] ??
    null;
  const period = me?.period;
  let limitLine: string | null = null;
  if (tool && current === "free") limitLine = OTTO.limit.tool(tool, trialOnOffer);
  else if (feature) {
    limitLine =
      current === "free"
        ? planIncludes("free", feature)
          ? OTTO.limit.freeUsed(feature, me?.usage?.[feature].limit)
          : OTTO.limit.none(feature, trialOnOffer)
        : budget
          ? budgetReachedText(period)
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
    const next = afterUpgradeSignIn(signedIn.plan, target?.plan ?? null);
    if (next === "already") {
      toast({ title: `You're already on ${PLANS[signedIn.plan].name}.`, variant: "success" });
      close();
      return;
    }
    if (next === "checkout" && target) void checkout.go(target.plan, target.interval);
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
  const size: DialogSize = offer.cards.length > 1 ? "lg" : "sm";
  const notNow = (
    <Button variant="secondary" onClick={close}>
      Not now
    </Button>
  );

  let view: View;
  if (!target) {
    view = {
      message:
        limitLine ??
        (current === "max"
          ? ACCOUNT_OTTO.alreadyMax
          : `You're on ${PLANS[current].name}, the biggest plan on sale here. Email us if you need more.`),
      title: feature
        ? `You've reached ${thisPeriod(period)}'s limit`
        : `You're on ${PLANS[current].name}`,
      description: feature
        ? `It resets ${resetWhen(period)}. Need more before then? Email us.`
        : undefined,
      footer: (
        <>
          <Button variant="secondary" onClick={close}>
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
  } else if (paymentIssue || resumeFirst) {
    const notice = paymentIssue ? PAYMENT_ISSUE_NOTICE : resumeFirstNotice(target.plan, onTrial);
    view = {
      message: limitLine ?? notice,
      title: paymentIssue ? "Update your card" : `Upgrade to ${PLANS[target.plan].name}`,
      description: limitLine ? notice : undefined,
      footer: (
        <>
          {notNow}
          <Button onClick={() => void portal.go()} loading={portal.pending} data-autofocus>
            <CreditCard />
            Manage billing
          </Button>
        </>
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
      description: !upgrading
        ? "Cancel anytime from your account."
        : onTrial
          ? trialUpgradeNotice(target.plan, target.interval)
          : "Your subscription changes in place: you pay only the difference, never twice.",
      body: pitch,
      size,
      footer: billingOff ? (
        <>
          <Button variant="secondary" onClick={close}>
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
