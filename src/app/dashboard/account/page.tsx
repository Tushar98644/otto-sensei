import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountSkeleton } from "@/app/(marketing)/account/_components/account-skeleton";
import { AccountView } from "@/app/(marketing)/account/_components/account-view";

export const metadata: Metadata = { title: "Account" };

// data-dashboard tells the account's sections to clear the dashboard's phone bar when a link scrolls to one.
export default function DashboardAccountPage() {
  return (
    <div data-dashboard className="flex flex-col gap-8 has-data-narrow:max-w-2xl">
      <h1 className="font-display text-4xl/10 font-normal tracking-tight text-ink sm:text-5xl/13">
        Account
      </h1>
      <Suspense fallback={<AccountSkeleton />}>
        <AccountView />
      </Suspense>
    </div>
  );
}
