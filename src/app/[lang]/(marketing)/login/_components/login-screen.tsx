import type { Metadata } from "next";
import { Suspense } from "react";
import type { LoginVariant } from "@/components/account/login-heading";
import { SignInFormSkeleton } from "@/components/account/sign-in-form-skeleton";
import type { LegalLinks } from "@/components/account/sign-in-terms";
import type { SignInWords } from "@/components/account/use-sign-in-words";
import { OttoNote } from "@/components/mascot/otto-note";
import { ROUTES } from "@/components/site/routes";
import { TextLink } from "@/components/site/text-link";
import type { Messages } from "@/i18n/messages";
import { getLocalize, localizedMetadata } from "@/i18n/publish";
import { rich } from "@/i18n/rich";
import { getMessages } from "@/i18n/server";
import { trialOffered } from "@/lib/billing/intervals";
import { LoginForm } from "./login-form";

export type LoginMessages = Messages["login"];

export async function loginMetadata(): Promise<Metadata> {
  const { meta } = await getMessages("login");
  return localizedMetadata({
    title: meta.title,
    description: meta.description,
    path: ROUTES.login,
    noindex: true,
  });
}

// loginHeading() in this language; `trial`: the Pro trial is on offer.
export function loginTitle(
  t: LoginMessages["heading"],
  variant: LoginVariant | null,
  trial: boolean,
): string {
  if (variant === "trial") return trial ? t.trial : t.upgrade;
  return variant ? t[variant] : t.signIn;
}

export type LoginWords = { t: LoginMessages; signIn: SignInWords; legal: LegalLinks };

// The page's words, the form's (no provider here) and the legal pages in this language where they're published.
export async function loginWords(): Promise<LoginWords> {
  const href = await getLocalize();
  return {
    t: await getMessages("login"),
    signIn: await getMessages("signIn"),
    legal: { terms: href(ROUTES.terms), privacy: href(ROUTES.privacy) },
  };
}

export function LoginScreen({
  t,
  signIn,
  legal,
  variant,
}: LoginWords & { variant: LoginVariant | null }) {
  const studio = (chunk: string) => <TextLink href={ROUTES.studio}>{chunk}</TextLink>;
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-4 py-16 sm:py-24">
      <h1 className="font-display text-4xl/10 font-normal tracking-tight text-balance text-ink sm:text-5xl/13">
        {loginTitle(t.heading, variant, trialOffered())}
      </h1>
      <OttoNote live={false} message={t.otto} />
      <Suspense fallback={<SignInFormSkeleton />}>
        <LoginForm
          googleFailed={t.googleFailed}
          signingIn={t.signingIn}
          words={signIn}
          legal={legal}
        />
      </Suspense>
      <p className="text-sm text-balance text-muted">{rich(t.studio, { link: studio })}</p>
    </div>
  );
}
