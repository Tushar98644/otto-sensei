import type { Metadata } from "next";
import { Suspense } from "react";
import { UpgradePromptHost } from "@/components/account/upgrade-prompt";
import { AccountSkeleton } from "./_components/account-skeleton";
import { AccountView } from "./_components/account-view";

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <div className="group/account mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-16 sm:px-6 sm:py-24">
      <h1 className="font-display text-4xl/10 font-normal tracking-tight text-ink group-has-data-sign-in/account:hidden sm:text-5xl/13">
        Your account
      </h1>
      {/* An error narrows only the panel, so the heading stays where the loading page put it; sign-in swaps both for its own, like /login. */}
      <div className="rounded-3xl bg-surface-muted p-3 has-data-narrow:max-w-2xl has-data-sign-in:bg-transparent has-data-sign-in:p-0 sm:p-6">
        <Suspense fallback={<AccountSkeleton />}>
          <AccountView />
        </Suspense>
      </div>
      <UpgradePromptHost />
    </div>
  );
}
