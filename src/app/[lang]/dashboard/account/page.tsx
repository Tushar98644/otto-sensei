import { Suspense } from "react";
import { AccountSkeleton } from "@/app/[lang]/(marketing)/account/_components/account-skeleton";
import { AccountView } from "@/app/[lang]/(marketing)/account/_components/account-view";
import { ACCOUNT_NAMESPACES } from "@/app/[lang]/(marketing)/account/namespaces";
import { getMessages, MessagesFor } from "@/i18n/server";
import { pageTitle } from "../page-title";

export const generateMetadata = () => pageTitle("account");

// data-dashboard tells the account's sections to clear the dashboard's phone bar when a link scrolls to one.
export default async function DashboardAccountPage() {
  const { pages } = await getMessages("dashboard");
  const { skeleton } = await getMessages("account");
  return (
    <div data-dashboard className="flex flex-col gap-8 has-data-narrow:max-w-2xl">
      <h1 className="font-display text-4xl/10 font-normal tracking-tight text-ink sm:text-5xl/13">
        {pages.account}
      </h1>
      <MessagesFor namespaces={ACCOUNT_NAMESPACES}>
        <Suspense fallback={<AccountSkeleton words={skeleton} />}>
          <AccountView />
        </Suspense>
      </MessagesFor>
    </div>
  );
}
