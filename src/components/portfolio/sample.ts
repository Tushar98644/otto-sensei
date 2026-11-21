import { emptyContent } from "@/lib/portfolio/content";
import { contentView } from "@/lib/portfolio/content-view";
import type { Portfolio } from "@/lib/portfolio/types";
import { portfolioView } from "@/lib/portfolio/view";
import type { Resume } from "@/lib/resume/schema";
import type { TemplateSample } from "./live-template";

// The page as it stands, or as a new one would start from the first resume.
export function pageSample(
  portfolio: Portfolio | null,
  candidates: readonly Resume[],
): TemplateSample | null {
  const source = portfolio
    ? (candidates.find((resume) => resume.id === portfolio.resumeId) ?? null)
    : null;
  const resume = portfolio
    ? portfolio.sync && source
      ? source
      : portfolio.snapshot
    : (candidates[0] ?? null);
  if (!resume) return null;
  const view = portfolioView(
    resume,
    portfolio
      ? {
          showEmail: portfolio.showEmail,
          showPhone: portfolio.showPhone,
          hiddenSections: portfolio.hiddenSections,
        }
      : { showEmail: false, showPhone: false, hiddenSections: [] },
  );
  return {
    view,
    content: contentView({
      view,
      content: portfolio?.content ?? emptyContent(),
      github: portfolio?.github ?? null,
    }),
  };
}
