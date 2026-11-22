import type { Metadata } from "next";
import { ConnectPage } from "@/components/extension/connect-page";
import { SiteLogo } from "@/components/site/site-logo";

export const metadata: Metadata = {
  title: "Connect Otto for Chrome",
  robots: { index: false, follow: false },
};

export default function ExtensionConnectPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="mx-auto flex w-full max-w-5xl px-4 pt-4 sm:px-6">
        <SiteLogo />
      </header>
      <main id="main" className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-12 sm:py-20">
        <ConnectPage />
      </main>
    </div>
  );
}
