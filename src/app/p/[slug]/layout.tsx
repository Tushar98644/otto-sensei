import type { Metadata } from "next";
import type { ReactNode } from "react";
import { RootDocument, ROOT_VIEWPORT, rootMetadata } from "@/components/site/root-document";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { loadMessages } from "@/i18n/messages";
import "../../globals.css";

export const viewport = ROOT_VIEWPORT;

export const metadata: Metadata = rootMetadata(DEFAULT_LOCALE);

// Portfolios have their own root layout, outside [lang]: the page's language is its owner's, not the visitor's.
export default async function PortfolioRootLayout({ children }: { children: ReactNode }) {
  const common = await loadMessages(DEFAULT_LOCALE, "common");
  return (
    <RootDocument lang={DEFAULT_LOCALE} skipLabel={common.skipToContent}>
      {children}
    </RootDocument>
  );
}
