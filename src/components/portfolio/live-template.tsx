"use client";

import { useMemo, type CSSProperties } from "react";
import type { PortfolioContentView } from "@/lib/portfolio/content";
import { jordanPage } from "@/lib/portfolio/fixtures/jordan";
import type { PortfolioTemplateId } from "@/lib/portfolio/types";
import type { PortfolioView } from "@/lib/portfolio/view";
import { cn } from "@/lib/utils";
import { templateFontClasses } from "./templates/fonts";
import { PORTFOLIO_TEMPLATES } from "./templates/registry";

// Loaded on demand by ./template-preview.tsx, so the templates, their styles and fonts only reach
// a screen when a preview is about to show.

export const LIVE_WIDTH = 1280;
export const LIVE_HEIGHT = 800;

export type TemplateSample = { view: PortfolioView; content: PortfolioContentView };

export function LiveTemplate({
  id,
  sample,
  scale,
}: {
  id: PortfolioTemplateId;
  // null: Jordan, the made-up person of the samples.
  sample: TemplateSample | null;
  scale: number;
}) {
  const data = useMemo(() => sample ?? jordanPage(), [sample]);
  const { Component } = PORTFOLIO_TEMPLATES[id];
  return (
    // A still picture: out of the tab order and the reading order, with the templates' looping
    // animations (sphere, canvases, branches) held still by data-pf-still. The transform makes
    // this box the containing block for a template's fixed parts (docks, nav bars).
    <div
      aria-hidden
      inert
      data-pf-still
      className={cn(
        "pointer-events-none absolute top-0 left-0 flex origin-top-left flex-col overflow-hidden",
        templateFontClasses(id),
      )}
      style={
        {
          width: LIVE_WIDTH,
          height: LIVE_HEIGHT,
          transform: `scale(${scale})`,
          "--pf-screen": `${LIVE_HEIGHT}px`,
        } as CSSProperties
      }
    >
      <Component view={data.view} content={data.content} />
    </div>
  );
}
