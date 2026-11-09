import type { ComponentType, ReactNode } from "react";
import type { PortfolioContentView } from "@/lib/portfolio/content";
import type { PortfolioTemplateInfo } from "@/lib/portfolio/templates";
import type { PortfolioView } from "@/lib/portfolio/view";

// The whole contract between a template and the rest of the app. A template draws `view` and
// `content` and nothing else: privacy choices are already applied in both. The template component
// itself uses no hooks or browser APIs, because the same component renders the public page on the
// server and the editor's preview; interactions live in small "use client" islands it renders.
export type PortfolioTemplateProps = {
  view: PortfolioView;
  // Everything beyond the resume (photo, project media, logos, location...), built from `view`
  // so the same privacy choices hold.
  content: PortfolioContentView;
  // The page's end matter (the "Made with" credit), drawn last on the template's own canvas.
  footer?: ReactNode;
};

export type PortfolioTemplate = PortfolioTemplateInfo & {
  Component: ComponentType<PortfolioTemplateProps>;
};
