import { Suspense } from "react";
import { ACCOUNT_OTTO } from "@/components/account/copy";
import { SignInFormSkeleton } from "@/components/account/sign-in-form-skeleton";
import { SignInScreen } from "@/components/account/sign-in-screen";
import { pageMetadata } from "@/components/site/page-metadata";
import { ROUTES } from "@/components/site/routes";
import { TextLink } from "@/components/site/text-link";
import { trialOffered } from "@/lib/billing/intervals";
import { loginHeading } from "./_components/login-heading";
import { LoginForm } from "./_components/login-form";

export const metadata = pageMetadata({
  title: "Sign in",
  description: "Sign in with Google or your email. No password needed: we can send you a 6-digit code.",
  path: ROUTES.login,
  noindex: true,
});

type LoginPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams;
  const heading = loginHeading(typeof next === "string" ? next : null, trialOffered());
  return (
    <div className="px-4 py-16 sm:py-24">
      <SignInScreen
        title={heading}
        message={ACCOUNT_OTTO.login}
        footer={
          <>
            Only checking a resume?{" "}
            <TextLink href={ROUTES.studio} className="whitespace-nowrap">
              Open the studio
            </TextLink>
            . No account needed.
          </>
        }
      >
        <Suspense fallback={<SignInFormSkeleton />}>
          <LoginForm />
        </Suspense>
      </SignInScreen>
    </div>
  );
}
