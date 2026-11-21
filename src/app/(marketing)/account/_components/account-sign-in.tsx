"use client";

import { ACCOUNT_OTTO, UPGRADE_SIGN_IN_TITLE } from "@/components/account/copy";
import { SignInForm } from "@/components/account/sign-in-form";
import { upgradeOffer } from "@/components/account/upgrade-offer";
import type { Me } from "@/components/account/use-me";
import { OttoNote } from "@/components/mascot/otto-note";
import { upgradeHref } from "@/components/site/routes";
import type { BillingInterval, PaidPlanId } from "@/config/plans";

export type AccountSignInProps = {
  billing: Me["billing"];
  plan: PaidPlanId | null;
  interval: BillingInterval | null;
  next: string | null;
  autoFocus: boolean;
  onSignedIn: () => void;
};

// data-sign-in lets the page drop its own heading and panel, so this reads like /login.
export function AccountSignIn({
  billing,
  plan,
  interval,
  next,
  autoFocus,
  onSignedIn,
}: AccountSignInProps) {
  const card =
    plan && billing.mode !== "disabled"
      ? upgradeOffer({
          current: "free",
          offer: billing.offer,
          picked: interval ?? "month",
          trial: billing.trial === true,
        }).cards.find((offered) => offered.plan === plan)
      : undefined;
  const title = card
    ? card.trial
      ? UPGRADE_SIGN_IN_TITLE.trial
      : UPGRADE_SIGN_IN_TITLE.upgrade
    : "Sign in";

  return (
    <div data-sign-in className="mx-auto flex w-full max-w-lg flex-col gap-8">
      <h1 className="font-display text-4xl/10 font-normal tracking-tight text-balance text-ink sm:text-5xl/13">
        {title}
      </h1>
      <OttoNote live={false} message={card ? ACCOUNT_OTTO.upgradeSignIn : ACCOUNT_OTTO.signedOut} />
      <SignInForm
        autoFocus={autoFocus}
        next={card ? upgradeHref(card.plan, card.interval, next) : undefined}
        onSignedIn={onSignedIn}
      />
    </div>
  );
}
