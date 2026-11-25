import type { ReactNode } from "react";
import { requirePublished } from "@/i18n/publish";
import { SEO_PATHS } from "@/lib/seo-pages/paths";

// Published per language with its namespace (src/i18n/pages.ts); elsewhere /compare is that language's 404.
export default async function CompareLayout({ children }: { children: ReactNode }) {
  await requirePublished(SEO_PATHS.compare);
  return children;
}
