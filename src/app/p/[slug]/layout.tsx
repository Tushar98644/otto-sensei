import type { Metadata } from "next";
import type { ReactNode } from "react";
import { RootDocument, ROOT_VIEWPORT, rootMetadata } from "@/components/site/root-document";
import { loadMessages } from "@/i18n/messages";
import { loadPublicPortfolio, portfolioLocale } from "@/lib/portfolio/page";
import "../../globals.css";

export const viewport = ROOT_VIEWPORT;

type Props = { children: ReactNode; params: Promise<{ slug: string }> };

async function localeOf(params: Props["params"]) {
  const { slug } = await params;
  return portfolioLocale(await loadPublicPortfolio(slug));
}

export async function generateMetadata({ params }: Omit<Props, "children">): Promise<Metadata> {
  return rootMetadata(await localeOf(params));
}

// Portfolios have their own root layout, outside [lang]: the page's language is its owner's, not the visitor's.
export default async function PortfolioRootLayout({ children, params }: Props) {
  const locale = await localeOf(params);
  const common = await loadMessages(locale, "common");
  return (
    <RootDocument
      lang={locale}
      skipLabel={common.skipToContent}
      referral={common.referral}
      toast={common.toast}
    >
      {children}
    </RootDocument>
  );
}
