import type { Metadata } from "next";
import { Suspense } from "react";
import { UpgradePromptHost } from "@/components/account/upgrade-prompt";
import { AccountSkeleton } from "./_components/account-skeleton";
import { AccountView } from "./_components/account-view";

export const metadata: Metadata = {
  title: "Account",
  robots: { index: false, follow: false },
};

// Everything here is per user, so the server sends a static shell and the browser fills it in.
// The marketing layout provides <main>.
export default function AccountPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-16 sm:px-6 sm:py-24">
      <h1 className="font-display text-4xl/10 font-normal tracking-tight text-ink sm:text-5xl/13">
        Your account
      </h1>
      {/* One stone panel holding white cards: white needs stone under it to read as a card. */}
      <div className="rounded-3xl bg-surface-muted p-3 sm:p-6">
        <Suspense fallback={<AccountSkeleton />}>
          <AccountView />
        </Suspense>
      </div>
      {/* The dashboard's account page has one from the app shell. */}
      <UpgradePromptHost />
    </div>
  );
}
