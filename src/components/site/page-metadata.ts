import type { Metadata } from "next";
import { BRAND } from "@/config/brand";

export type PageMetadataOptions = {
  title: string;
  description: string;
  path: string;
  absoluteTitle?: boolean;
  noindex?: boolean;
};

// A root-level image route (src/app/opengraph-image.tsx) gets no hash suffix in its path.
const OG_IMAGE = {
  url: "/opengraph-image",
  type: "image/png",
  width: 1200,
  height: 630,
  alt: `${BRAND.name}: ${BRAND.tagline}`,
};

// Next merges metadata one level deep, so openGraph here replaces the root's, image included.
export function pageMetadata({
  title,
  description,
  path,
  absoluteTitle = false,
  noindex = false,
}: PageMetadataOptions): Metadata {
  const shareTitle = absoluteTitle ? title : `${title} · ${BRAND.name}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: "website",
      siteName: BRAND.name,
      locale: "en_US",
      url: path,
      title: shareTitle,
      description,
      images: [{ ...OG_IMAGE }],
    },
    twitter: {
      card: "summary_large_image",
      title: shareTitle,
      description,
      images: [{ url: OG_IMAGE.url, alt: OG_IMAGE.alt }],
    },
  };
}
