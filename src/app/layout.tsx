import type { Metadata, Viewport } from "next";
import { EB_Garamond, Inter } from "next/font/google";
import type { ReactNode } from "react";
import { LoadingScreenHost } from "@/components/mascot/otto-loading-screen";
import { ReferralTracker } from "@/components/referrals/referral-tracker";
import { Toaster } from "@/components/ui/toast";
import { BRAND } from "@/config/brand";
import { Analytics } from "@/lib/analytics/analytics";
import { appUrl } from "@/lib/env";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

// The italic face is declared only where headings use it: (marketing)/_components/display-italic.ts.
const garamond = EB_Garamond({ subsets: ["latin"], display: "swap", variable: "--font-garamond" });

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: {
    default: `${BRAND.name} - ${BRAND.tagline}`,
    template: `%s · ${BRAND.name}`,
  },
  description: BRAND.description,
  applicationName: BRAND.name,
  openGraph: { type: "website", siteName: BRAND.name, locale: "en_US" },
  twitter: { card: "summary_large_image" },
  // iOS would otherwise turn the phone numbers and emails in resume previews into links.
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: "#fbfcfa",
  colorScheme: "only light",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // The font variables must sit on <html>: the @theme font tokens are resolved at :root.
    <html lang="en" className={`${inter.variable} ${garamond.variable}`}>
      <body>
        <a
          href="#main"
          className="fixed top-4 left-4 z-50 -translate-y-16 rounded-full bg-surface px-4 py-2 text-sm font-medium text-ink transition-transform focus:translate-y-0 focus:shadow-float"
        >
          Skip to content
        </a>
        <LoadingScreenHost>{children}</LoadingScreenHost>
        <Toaster />
        <Analytics />
        <ReferralTracker />
      </body>
    </html>
  );
}
