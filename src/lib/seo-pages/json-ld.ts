import type { JsonLdData } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/urls";

export type Crumb = { name: string; path: string };

export function breadcrumbJsonLd(crumbs: readonly Crumb[], base: string): JsonLdData {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path, base),
    })),
  };
}
