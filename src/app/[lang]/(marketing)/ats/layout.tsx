import type { ReactNode } from "react";
import { requirePublished } from "@/i18n/publish";
import { SEO_PATHS } from "@/lib/seo-pages/paths";

// Published per language with its namespace (src/i18n/pages.ts); elsewhere /ats is that language's 404.
export default async function AtsLayout({ children }: { children: ReactNode }) {
  await requirePublished(SEO_PATHS.ats);
  return children;
}
