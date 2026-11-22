import { Suspense } from "react";
import { ACCOUNT_OTTO } from "@/components/account/copy";
import { loginHeading, type LoginVariant } from "@/components/account/login-heading";
import { SignInFormSkeleton } from "@/components/account/sign-in-form-skeleton";
import { OttoNote } from "@/components/mascot/otto-note";
import { pageMetadata } from "@/components/site/page-metadata";
import { ROUTES } from "@/components/site/routes";
import { TextLink } from "@/components/site/text-link";
import { trialOffered } from "@/lib/billing/intervals";
import { LoginForm } from "./login-form";

export const loginMetadata = pageMetadata({
  title: "Sign in",
  description:
    "Sign in with Google or your email. No password needed: we can send you a 6-digit code.",
  path: ROUTES.login,
  noindex: true,
});

export function LoginScreen({ variant }: { variant: LoginVariant | null }) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-4 py-16 sm:py-24">
      <h1 className="font-display text-4xl/10 font-normal tracking-tight text-balance text-ink sm:text-5xl/13">
        {loginHeading(variant, trialOffered())}
      </h1>
      <OttoNote live={false} message={ACCOUNT_OTTO.login} />
      <Suspense fallback={<SignInFormSkeleton />}>
        <LoginForm />
      </Suspense>
      <p className="text-sm text-balance text-muted">
        Only checking a resume? <TextLink href={ROUTES.studio}>Open the studio</TextLink>. No
        account needed.
      </p>
    </div>
  );
}
