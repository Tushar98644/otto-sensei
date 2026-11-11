import type { ComponentType, ReactNode } from "react";
import type { PortfolioContentView } from "@/lib/portfolio/content";
import type { PortfolioTemplateInfo } from "@/lib/portfolio/templates";
import type { PortfolioView } from "@/lib/portfolio/view";

// A template draws `view` and `content` and nothing else: privacy choices are already applied in
// both. No hooks or browser APIs: the same component renders the public page on the server and
// the editor's preview; interactions live in small "use client" islands.
export type PortfolioTemplateProps = {
  view: PortfolioView;
  // Everything beyond the resume (photo, project media, logos, location...), built from `view`
  // so the same privacy choices hold.
  content: PortfolioContentView;
  // Optional end matter, drawn last on the template's own canvas. Pages pass none today.
  footer?: ReactNode;
};

export type PortfolioTemplate = PortfolioTemplateInfo & {
  Component: ComponentType<PortfolioTemplateProps>;
};
