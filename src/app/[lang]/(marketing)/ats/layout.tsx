import type { ReactNode } from "react";
import { requirePublished } from "@/i18n/publish";
import { SEO_PATHS } from "@/lib/seo-pages/paths";

// English until translated (P5): another language's /ats is a 404.
export default async function AtsLayout({ children }: { children: ReactNode }) {
  await requirePublished(SEO_PATHS.ats);
  return children;
}
