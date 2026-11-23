"use client";

import { memo, use, type ComponentType } from "react";
import type { PortfolioTemplateId } from "@/lib/portfolio/types";
import type { DesignFaces } from "./faces";
import { markFulfilled } from "./on-demand";
import type { PortfolioTemplateProps } from "./types";

type Template = ComponentType<PortfolioTemplateProps>;
type Design = { Template: Template; fonts: string };

type Islands = { loader: { preload: () => Promise<unknown> } };

// A design's template, islands and fonts arrive together, so a preloaded design draws without waiting again.
async function design<M>(
  template: Promise<M>,
  islands: Promise<Islands>,
  fonts: Promise<{ designFonts: DesignFaces }>,
  pick: (module: M) => Template,
): Promise<Design> {
  const [module, , faces] = await Promise.all([
    template,
    islands.then(({ loader }) => loader.preload()),
    fonts,
  ]);
  return { Template: pick(module), fonts: faces.designFonts.classes };
}

const IMPORTS: Record<PortfolioTemplateId, () => Promise<Design>> = {
  navy: () =>
    design(
      import("./navy/navy"),
      import("./navy/on-demand"),
      import("./navy/fonts"),
      (m) => m.NavyTemplate,
    ),
  dock: () =>
    design(
      import("./dock/dock"),
      import("./dock/on-demand"),
      import("./dock/fonts"),
      (m) => m.DockTemplate,
    ),
  reel: () =>
    design(
      import("./reel/reel"),
      import("./reel/on-demand"),
      import("./reel/fonts"),
      (m) => m.ReelTemplate,
    ),
  bento: () =>
    design(
      import("./bento/bento"),
      import("./bento/on-demand"),
      import("./bento/fonts"),
      (m) => m.BentoTemplate,
    ),
  cv: () =>
    design(import("./cv/cv"), import("./cv/on-demand"), import("./cv/fonts"), (m) => m.CvTemplate),
  prose: () =>
    design(
      import("./prose/prose"),
      import("./prose/on-demand"),
      import("./prose/fonts"),
      (m) => m.ProseTemplate,
    ),
  folio: () =>
    design(
      import("./folio/folio"),
      import("./folio/on-demand"),
      import("./folio/fonts"),
      (m) => m.FolioTemplate,
    ),
  paper: () =>
    design(
      import("./paper/paper"),
      import("./paper/on-demand"),
      import("./paper/fonts"),
      (m) => m.PaperTemplate,
    ),
  gazette: () =>
    design(
      import("./gazette/gazette"),
      import("./gazette/on-demand"),
      import("./gazette/fonts"),
      (m) => m.GazetteTemplate,
    ),
  terminal: () =>
    design(
      import("./terminal/terminal"),
      import("./terminal/on-demand"),
      import("./terminal/fonts"),
      (m) => m.TerminalTemplate,
    ),
  brutal: () =>
    design(
      import("./brutal/brutal"),
      import("./brutal/on-demand"),
      import("./brutal/fonts"),
      (m) => m.BrutalTemplate,
    ),
  card: () =>
    design(
      import("./card/card"),
      import("./card/on-demand"),
      import("./card/fonts"),
      (m) => m.CardTemplate,
    ),
  retro: () =>
    design(
      import("./retro/retro"),
      import("./retro/on-demand"),
      import("./retro/fonts"),
      (m) => m.RetroTemplate,
    ),
  starring: () =>
    design(
      import("./starring/starring"),
      import("./starring/on-demand"),
      import("./starring/fonts"),
      (m) => m.StarringTemplate,
    ),
  bubble: () =>
    design(
      import("./bubble/bubble"),
      import("./bubble/on-demand"),
      import("./bubble/fonts"),
      (m) => m.BubbleTemplate,
    ),
};

const loading = new Map<PortfolioTemplateId, Promise<Design>>();

function loadDesign(id: PortfolioTemplateId): Promise<Design> {
  let pending = loading.get(id);
  if (!pending) {
    const settling: Promise<Design> = IMPORTS[id]().then(
      (design) => {
        markFulfilled(settling, design);
        return design;
      },
      (error: unknown) => {
        loading.delete(id);
        throw error;
      },
    );
    pending = settling;
    loading.set(id, pending);
  }
  return pending;
}

const templates = new Map<PortfolioTemplateId, Promise<Template>>();

export function loadTemplate(id: PortfolioTemplateId): Promise<Template> {
  let pending = templates.get(id);
  if (!pending) {
    pending = loadDesign(id).then(
      (design) => design.Template,
      (error: unknown) => {
        templates.delete(id);
        throw error;
      },
    );
    templates.set(id, pending);
  }
  return pending;
}

export function preloadTemplate(id: PortfolioTemplateId): void {
  loadDesign(id).catch(() => {});
}

// Draws at once when the code is already here (a preload counts), where React.lazy would suspend first.
export const LazyTemplate = memo(function LazyTemplate({
  id,
  ...page
}: PortfolioTemplateProps & { id: PortfolioTemplateId }) {
  const { Template, fonts } = use(loadDesign(id));
  // The design's font variables, on a box that draws nothing, so the template lays out as before.
  return (
    <div className={`contents ${fonts}`}>
      <Template {...page} />
    </div>
  );
});
