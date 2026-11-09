"use client";

import { Window } from "@/components/ui/panel";
import type { PortfolioContentView } from "@/lib/portfolio/content";
import { portfolioPath, type PortfolioTemplateId } from "@/lib/portfolio/types";
import type { PortfolioView } from "@/lib/portfolio/view";
import { cn } from "@/lib/utils";
import { PortfolioCredit } from "./credit";
import { templateFontClasses } from "./templates/fonts";
import { PORTFOLIO_TEMPLATES } from "./templates/registry";

type PortfolioPreviewProps = {
  view: PortfolioView;
  // The editor's live content: photo, project media, location and the rest.
  content: PortfolioContentView;
  template: PortfolioTemplateId;
  slug: string;
  credit: boolean;
};

// The page as readers get it, drawn by the same template component as /p/<slug>. Templates size
// themselves by their container, so this column shows the layout a phone or tablet gets. The
// outer box is a containing block for position: fixed (contain: layout), so a template's fixed
// header, side rails or dock stay inside the preview instead of covering the editor, and
// --pf-screen makes "one screen tall" sections fit the preview's height.
export function PortfolioPreview({ view, content, template, slug, credit }: PortfolioPreviewProps) {
  const { Component, name } = PORTFOLIO_TEMPLATES[template];
  return (
    <Window title={portfolioPath(slug)} meta={`Preview · ${name}`} className="lg:sticky lg:top-6">
      {/* Out of the tab order and the reading order: it repeats the settings beside it, and its
          own h1 would sit under the screen's. "Open page" shows the real thing. */}
      <div className="relative contain-layout">
        <div
          inert
          className={cn(
            "flex max-h-[80dvh] flex-col overflow-y-auto [--pf-screen:80dvh]",
            templateFontClasses(template),
          )}
        >
          <Component view={view} content={content} footer={credit ? <PortfolioCredit /> : null} />
        </div>
      </div>
    </Window>
  );
}
