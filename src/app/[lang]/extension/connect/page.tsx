import type { Metadata } from "next";
import { ConnectPage } from "@/components/extension/connect-page";
import { SiteLogo } from "@/components/site/site-logo";
import { getMessages } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { extension } = await getMessages("account");
  return { title: extension.connect.meta, robots: { index: false, follow: false } };
}

// Only this page's words reach the browser, as a prop: no messages provider here.
export default async function ExtensionConnectPage() {
  const { extension } = await getMessages("account");
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="mx-auto flex w-full max-w-5xl px-4 pt-4 sm:px-6">
        <SiteLogo />
      </header>
      <main id="main" className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-12 sm:py-20">
        <ConnectPage words={extension.connect} />
      </main>
    </div>
  );
}
