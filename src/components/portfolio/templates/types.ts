import type { ComponentType, ReactNode } from "react";
import type { Messages } from "@/i18n/messages";
import type { PortfolioContentView } from "@/lib/portfolio/content";
import type { PortfolioTemplateInfo } from "@/lib/portfolio/templates";
import type { PortfolioView } from "@/lib/portfolio/view";

// Every design's own words, in the portfolio's language (designLocale), never the visitor's.
export type DesignWords = Messages["portfolioDesigns"];

// Templates draw only `view` and `content`: privacy choices are already applied in both.
export type PortfolioTemplateProps = {
  view: PortfolioView;
  content: PortfolioContentView;
  words: DesignWords;
  footer?: ReactNode;
  resumeHref?: string | null;
};

export type PortfolioTemplate = PortfolioTemplateInfo & {
  Component: ComponentType<PortfolioTemplateProps>;
};
