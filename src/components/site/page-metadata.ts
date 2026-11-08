import type { Metadata } from "next";
import { BRAND } from "@/config/brand";

export type PageMetadataOptions = {
  // Becomes "<title> · Otto Sensei" through the root layout's title template.
  title: string;
  description: string;
  // Site-relative; the root layout's metadataBase makes it absolute.
  path: string;
  // Use the title as is, without the template. For the home page.
  absoluteTitle?: boolean;
};

// Served by src/app/opengraph-image.tsx. A root-level image route gets no hash suffix in its path.
const OG_IMAGE = {
  url: "/opengraph-image",
  type: "image/png",
  width: 1200,
  height: 630,
  alt: `${BRAND.name}: ${BRAND.tagline}`,
};

/**
 * Title, description, canonical URL and Open Graph tags for a public page.
 * Next merges metadata one level deep, so a page's openGraph replaces the root layout's whole
 * openGraph, including the file-based share image. That's why the shared fields are restated here.
 */
export function pageMetadata({
  title,
  description,
  path,
  absoluteTitle = false,
}: PageMetadataOptions): Metadata {
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: BRAND.name,
      locale: "en_US",
      url: path,
      // Matches the root title template; Open Graph titles don't go through it.
      title: absoluteTitle ? title : `${title} · ${BRAND.name}`,
      description,
      images: [{ ...OG_IMAGE }],
    },
  };
}
