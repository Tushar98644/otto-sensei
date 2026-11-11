import type { ComponentType, ReactNode } from "react";
import type { PortfolioContentView } from "@/lib/portfolio/content";
import type { PortfolioTemplateInfo } from "@/lib/portfolio/templates";
import type { PortfolioView } from "@/lib/portfolio/view";

// Templates draw only `view` and `content`: privacy choices are already applied in both.
export type PortfolioTemplateProps = {
  view: PortfolioView;
  content: PortfolioContentView;
  footer?: ReactNode;
};

export type PortfolioTemplate = PortfolioTemplateInfo & {
  Component: ComponentType<PortfolioTemplateProps>;
};
