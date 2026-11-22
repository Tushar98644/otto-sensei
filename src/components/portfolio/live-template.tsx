"use client";

import { useMemo, type CSSProperties } from "react";
import type { PortfolioContentView } from "@/lib/portfolio/content";
import { jordanPage } from "@/lib/portfolio/fixtures/jordan";
import type { PortfolioTemplateId } from "@/lib/portfolio/types";
import type { PortfolioView } from "@/lib/portfolio/view";
import { cn } from "@/lib/utils";
import { LIVE_HEIGHT, LIVE_WIDTH } from "./live-size";
import { templateFontClasses } from "./templates/fonts";
import { LazyTemplate } from "./templates/lazy";

export type TemplateSample = { view: PortfolioView; content: PortfolioContentView };

export function LiveTemplate({
  id,
  sample,
  scale,
}: {
  id: PortfolioTemplateId;
  sample: TemplateSample | null;
  scale: number;
}) {
  const data = useMemo(() => sample ?? jordanPage(), [sample]);
  return (
    // The transform makes this box the containing block for a template's fixed parts.
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
      <LazyTemplate id={id} view={data.view} content={data.content} />
    </div>
  );
}
