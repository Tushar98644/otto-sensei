import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { RootDocument, ROOT_VIEWPORT, rootMetadata } from "@/components/site/root-document";
import { ENABLED_LOCALES, isEnabledLocale, localeFromSegment, localeSegment } from "@/i18n/config";
import { getLocale, getMessages } from "@/i18n/server";
import "../globals.css";

export const viewport = ROOT_VIEWPORT;

// Only live languages are prerendered; src/proxy.ts sends every other prefix to the English 404.
export function generateStaticParams(): { lang: string }[] {
  return ENABLED_LOCALES.map((locale) => ({ lang: localeSegment(locale) }));
}

// src/app/opengraph-image.tsx sits above this layout, whose openGraph would replace its image, so the image is passed on.
export async function generateMetadata(_: unknown, parent: ResolvingMetadata): Promise<Metadata> {
  const { openGraph } = await parent;
  const { brand } = await getMessages("common");
  return rootMetadata(await getLocale(), openGraph?.images, brand);
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const locale = localeFromSegment((await params).lang);
  // Reached only by paths the proxy never sees (/api/…, /p/…/…, files): no page lives there.
  if (!isEnabledLocale(locale)) notFound();
  const common = await getMessages("common");
  return (
    <RootDocument lang={locale} skipLabel={common.skipToContent} referral={common.referral}>
      {children}
    </RootDocument>
  );
}
