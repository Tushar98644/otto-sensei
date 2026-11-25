import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { LoadingScreenHost } from "@/components/mascot/otto-loading-screen";
import { ReferralTracker } from "@/components/referrals/referral-tracker";
import { TITLE_SUFFIX } from "@/components/site/page-metadata";
import { Toaster } from "@/components/ui/toast";
import { BRAND } from "@/config/brand";
import { openGraphLocale, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { Analytics } from "@/lib/analytics/analytics";
import { appUrl } from "@/lib/env";

type SocialImage = string | URL | { url: string | URL };

const pathOf = (url: string | URL) => {
  const { pathname, search } = new URL(url, "http://localhost");
  return `${pathname}${search}`;
};

// Resolved image URLs are absolute; their path lets this layout's metadataBase place them, as it did when the layout sat beside the image.
function onThisSite(images: readonly SocialImage[]) {
  return images.map((image) =>
    typeof image === "string" || image instanceof URL
      ? pathOf(image)
      : { ...image, url: pathOf(image.url) },
  );
}

// Both root layouts use these: src/app/[lang]/layout.tsx and the portfolios' src/app/p/[slug]/layout.tsx.
export function rootMetadata(
  locale: Locale,
  openGraphImages?: readonly SocialImage[],
  // The tagline and description in the page's language.
  brand: { tagline: string; description: string } = BRAND,
): Metadata {
  const images = openGraphImages?.length ? { images: onThisSite(openGraphImages) } : {};
  return {
    metadataBase: new URL(appUrl()),
    title: {
      default: `${BRAND.name} - ${brand.tagline}`,
      template: `%s${TITLE_SUFFIX}`,
    },
    description: brand.description,
    applicationName: BRAND.name,
    openGraph: {
      type: "website",
      siteName: BRAND.name,
      locale: openGraphLocale(locale),
      ...images,
    },
    twitter: { card: "summary_large_image" },
    // iOS would otherwise turn the phone numbers and emails in resume previews into links.
    formatDetection: { telephone: false, email: false, address: false },
  };
}

export const ROOT_VIEWPORT: Viewport = {
  themeColor: "#fbfcfa",
  colorScheme: "only light",
};

export function RootDocument({
  lang,
  skipLabel,
  referral,
  children,
}: {
  lang: string;
  skipLabel: string;
  referral: Messages["common"]["referral"];
  children: ReactNode;
}) {
  return (
    // The app's fonts come from components/site/site-fonts.tsx, rendered by each layout except /p.
    <html lang={lang}>
      <body>
        <a
          href="#main"
          className="fixed top-4 left-4 z-50 -translate-y-16 rounded-full bg-surface px-4 py-2 text-sm font-medium text-ink transition-transform focus:translate-y-0 focus:shadow-float"
        >
          {skipLabel}
        </a>
        <LoadingScreenHost>{children}</LoadingScreenHost>
        <Toaster />
        <Analytics />
        <ReferralTracker words={referral} />
      </body>
    </html>
  );
}
