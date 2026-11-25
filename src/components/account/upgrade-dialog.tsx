"use client";

import { ArrowLeft, CreditCard } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { OttoNote } from "@/components/mascot/otto-note";
import { useOtto } from "@/components/mascot/use-otto";
import { upgradeHref } from "@/components/site/routes";
import { Button, buttonClasses } from "@/components/ui/button";
import { Dialog, type DialogSize } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import {
  isPaidPlan,
  isTrialing,
  nextPlan,
  planIncludes,
  PLANS,
  PRO_TRIAL,
  type BillingInterval,
  type Feature,
  type PaidPlanId,
  type PlanId,
  type ProTool,
} from "@/config/plans";
import { TOPUP_LIMITS } from "@/config/topup";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import type { SessionUser } from "@/lib/auth/types";
import { isKeptTool } from "@/lib/plan-limits-copy";
import { TRASH_DAYS } from "@/lib/store/history";
import { periodNoun, usageCopy } from "@/lib/usage-copy";
import { BillingNote } from "./billing-note";
import { SUPPORT_MAILTO } from "./copy";
import { LazyAddCreditDialog } from "./lazy-dialogs";
import { buysIn, centsIn, usdIn } from "./local-prices";
import { PlanOffer } from "./plan-offer";
import { SignInForm } from "./sign-in-form";
import { useTrialUpgradeCopy } from "./trial-upgrade";
import { afterUpgradeSignIn, upgradeOffer } from "./upgrade-offer";
import { returnPathHere } from "./upgrade-return";
import { useBillingRedirect } from "./use-billing-redirect";
import { useMe } from "./use-me";
import { useSignInWords } from "./use-sign-in-words";

export type ReplaceOffer = { title: string; onReplace: () => void };

export type UpgradeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: Feature;
  budget?: boolean;
  tool?: ProTool;
  plan?: PaidPlanId;
  interval?: BillingInterval;
  replace?: ReplaceOffer;
  // How many resumes or applications a paid plan at its number holds.
  held?: number;
  // Where to go back once the plan is active; without it, the page the dialog opened on.
  next?: string | null;
  startAtSignIn?: boolean;
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
  replace,
  held,
  next,
  startAtSignIn = false,
}: UpgradeDialogProps) {
  const { me, user, loading } = useMe();
  const t = useMessages("upgrade");
  const signInWords = useSignInWords();
  const otto = useOtto();
  const format = useFormat();
  const periods = usageCopy(useMessages("app").usage, format);
  const trialCopy = useTrialUpgradeCopy();
  const checkout = useBillingRedirect("checkout");
  const portal = useBillingRedirect("portal");
  const firstStage: Stage = startAtSignIn ? "sign-in" : "pitch";
  const [stage, setStage] = useState<Stage>(firstStage);
  const [startedOn, setStartedOn] = useState<string | null>(null);
  const [chosen, setChosen] = useState<PaidPlanId | null>(plan ?? null);
  const [pickedInterval, setPickedInterval] = useState<BillingInterval | null>(interval ?? null);
  const [adding, setAdding] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setStage(firstStage);
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
  // A paid plan at its number of resumes or applications: its line names the next plan itself.
  const full = tool && isKeptTool(tool) && isPaidPlan(current);
  let limitLine: string | null = null;
  if (tool && current === "free") limitLine = otto.limit.tool(tool, trialOnOffer);
  else if (full) limitLine = otto.limit.full(tool, current, held, target !== null);
  else if (feature) {
    limitLine =
      current === "free"
        ? planIncludes("free", feature)
          ? otto.limit.freeUsed(feature, me?.usage?.[feature].limit)
          : otto.limit.none(feature, trialOnOffer)
        : budget
          ? otto.budget(period)
          : otto.limit.reached(feature, me?.usage?.[feature].limit, period);
  }
  const close = () => onOpenChange(false);
  // Past the allowance or the AI budget, a paid plan can also add credit; Pro still sees Max first.
  const credit = me?.billing.credit;
  const creditOffer = feature !== undefined && credit?.usable === true;
  const creditLine = creditOffer ? (
    <p className="text-sm/6 text-muted">
      {fmt(t.creditFrom, {
        min: usdIn(format, TOPUP_LIMITS.minUsd),
        buys: buysIn(t.credit, format, 1),
      })}
      {credit.balanceCents > 0
        ? ` ${fmt(t.balance, { balance: centsIn(format, credit.balanceCents) })}`
        : ""}
    </p>
  ) : null;
  const maxFirst = creditOffer && current === "pro" && credit.monthCents > MAX_OVER_PRO_CENTS;
  const addCredit = (variant: "primary" | "secondary") =>
    creditOffer ? (
      <Button
        variant={variant}
        onClick={() => {
          flushSync(close);
          setAdding(true);
        }}
      >
        {t.buttons.addCredit}
      </Button>
    ) : null;
  const replaceNoteId = useId();
  const replacing = tool === "resumes" && current === "free" ? (replace ?? null) : null;
  const replaceNote = replacing ? (
    <p id={replaceNoteId} className="text-sm/6 text-muted">
      {fmt(t.replace, { title: replacing.title, days: TRASH_DAYS })}
    </p>
  ) : null;
  // Closed first: the modal leaves the page inert, and the replacement may open a file picker there.
  const replaceKey = replacing ? (
    <Button
      variant="secondary"
      aria-describedby={replaceNoteId}
      onClick={() => {
        flushSync(close);
        replacing.onReplace();
      }}
    >
      {t.buttons.replace}
    </Button>
  ) : null;

  const back = next ?? startedOn;

  function choose(card: { plan: PaidPlanId; interval: BillingInterval }) {
    setChosen(card.plan);
    const from = next ?? returnPathHere();
    if (user) {
      void checkout.go(card.plan, card.interval, from);
      return;
    }
    setStartedOn(from);
    setStage("sign-in");
  }

  function handleSignedIn(signedIn: SessionUser) {
    setStage("pitch");
    const step = afterUpgradeSignIn(signedIn.plan, target?.plan ?? null);
    if (step === "already") {
      // A host that names next goes back there and says this on the way.
      if (!next) {
        toast({
          title: fmt(t.toast.alreadyOn, { plan: PLANS[signedIn.plan].name }),
          variant: "success",
        });
      }
      close();
      return;
    }
    if (step === "checkout" && target) void checkout.go(target.plan, target.interval, back);
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
      {creditLine}
      {replaceNote}
    </div>
  );
  const size: DialogSize = offer.cards.length > 1 ? "lg" : "sm";
  const notNow = (
    <Button variant="secondary" onClick={close}>
      {t.buttons.notNow}
    </Button>
  );
  const upgradeTo = (to: PaidPlanId) => fmt(t.title.upgradeTo, { plan: PLANS[to].name });

  let view: View;
  if (!target) {
    view = {
      message:
        limitLine ??
        (current === "max"
          ? t.otto.alreadyMax
          : fmt(t.otto.biggest, { plan: PLANS[current].name })),
      title: feature
        ? t.title.reached[periodNoun(period)]
        : fmt(t.title.onPlan, { plan: PLANS[current].name }),
      description: feature
        ? fmt(creditOffer ? t.resetsCredit : t.resets, { when: periods.resetWhen(period) })
        : undefined,
      body: creditLine ?? undefined,
      footer: (
        <>
          <Button variant="secondary" onClick={close}>
            {t.buttons.close}
          </Button>
          <a
            href={SUPPORT_MAILTO}
            className={buttonClasses(creditOffer ? { variant: "secondary" } : undefined)}
          >
            {t.buttons.emailUs}
          </a>
          {addCredit("primary")}
        </>
      ),
    };
  } else if (stage === "sign-in" && !user && !billingOff) {
    view = {
      message: signInWords.upgrade.otto,
      title: target.trial ? signInWords.upgrade.trial : signInWords.upgrade.upgrade,
      description: signInWords.upgrade.description,
      body: (
        <SignInForm
          autoFocus
          next={upgradeHref(target.plan, target.interval, back)}
          onSignedIn={handleSignedIn}
        />
      ),
      footer: (
        <Button variant="ghost" onClick={() => setStage("pitch")}>
          <ArrowLeft />
          {t.buttons.back}
        </Button>
      ),
    };
  } else if (paymentIssue || resumeFirst) {
    const notice = paymentIssue
      ? trialCopy.paymentIssue
      : trialCopy.resumeFirstNotice(target.plan, onTrial);
    view = {
      message: limitLine ?? notice,
      title: paymentIssue ? t.title.updateCard : upgradeTo(target.plan),
      description: limitLine ? notice : undefined,
      body: replaceNote ?? undefined,
      footer: (
        <>
          {notNow}
          {replaceKey}
          <Button onClick={() => void portal.go()} loading={portal.pending} data-autofocus>
            <CreditCard />
            {t.buttons.manageBilling}
          </Button>
        </>
      ),
    };
  } else {
    const upgrading = current !== "free";
    view = {
      message: billingOff
        ? (limitLine ?? t.otto.billingOff)
        : limitLine && upgrading && !full
          ? fmt(t.otto.hasMore, { line: limitLine, plan: PLANS[target.plan].name }) +
            (maxFirst && credit
              ? ` ${fmt(t.otto.monthCredit, {
                  spent: centsIn(format, credit.monthCents),
                  extra: centsIn(format, MAX_OVER_PRO_CENTS),
                  max: PLANS.max.name,
                  pro: PLANS.pro.name,
                })}`
              : "")
          : (limitLine ?? (target.trial ? otto.upgrade.trial : t.otto.pitch)),
      title: upgrading
        ? upgradeTo(target.plan)
        : offer.cards.length > 1
          ? t.title.choose
          : target.trial
            ? fmt(t.title.trial, { plan: PLANS[PRO_TRIAL.plan].name, days: PRO_TRIAL.days })
            : upgradeTo(target.plan),
      description: !upgrading
        ? t.cancelAnytime
        : onTrial
          ? trialCopy.notice(target.plan, target.interval)
          : t.inPlace,
      body: pitch,
      size,
      footer: billingOff ? (
        <>
          <Button variant="secondary" onClick={close}>
            {t.buttons.close}
          </Button>
          {replaceKey}
          <a href={SUPPORT_MAILTO} className={buttonClasses()} data-autofocus>
            {t.buttons.emailUs}
          </a>
        </>
      ) : (
        <>
          {notNow}
          {replaceKey}
          {addCredit("secondary")}
        </>
      ),
    };
  }

  return (
    <>
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
      {creditOffer || adding ? (
        <LazyAddCreditDialog open={adding} onOpenChange={setAdding} next={next ?? null} />
      ) : null}
    </>
  );
}

const MAX_OVER_PRO_CENTS = (PLANS.max.priceUsd - PLANS.pro.priceUsd) * 100;
