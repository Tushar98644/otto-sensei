import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountSkeleton } from "@/app/(marketing)/account/_components/account-skeleton";
import { AccountView } from "@/app/(marketing)/account/_components/account-view";

export const metadata: Metadata = { title: "Account" };

// The same account view as /account (which stays for the pricing page's ?upgrade=1 and the
// checkout return), inside the dashboard frame. It reads ?checkout= and ?upgrade=, hence Suspense.
export default function DashboardAccountPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <h1 className="font-display text-4xl/10 font-normal tracking-tight text-ink sm:text-5xl/13">
        Account
      </h1>
      <Suspense fallback={<AccountSkeleton />}>
        <AccountView />
      </Suspense>
    </div>
  );
}
