"use client";

import { memo, use, type ComponentType } from "react";
import type { PortfolioTemplateId } from "@/lib/portfolio/types";
import type { PortfolioTemplateProps } from "./types";

type Template = ComponentType<PortfolioTemplateProps>;

const IMPORTS: Record<PortfolioTemplateId, () => Promise<Template>> = {
  navy: () => import("./navy/navy").then((module) => module.NavyTemplate),
  dock: () => import("./dock/dock").then((module) => module.DockTemplate),
  reel: () => import("./reel/reel").then((module) => module.ReelTemplate),
  bento: () => import("./bento/bento").then((module) => module.BentoTemplate),
  cv: () => import("./cv/cv").then((module) => module.CvTemplate),
  prose: () => import("./prose/prose").then((module) => module.ProseTemplate),
  folio: () => import("./folio/folio").then((module) => module.FolioTemplate),
  paper: () => import("./paper/paper").then((module) => module.PaperTemplate),
};

const loaded = new Map<PortfolioTemplateId, Template>();
const loading = new Map<PortfolioTemplateId, Promise<Template>>();

export function loadTemplate(id: PortfolioTemplateId): Promise<Template> {
  let pending = loading.get(id);
  if (!pending) {
    pending = IMPORTS[id]().then(
      (template) => {
        loaded.set(id, template);
        return template;
      },
      (error: unknown) => {
        loading.delete(id);
        throw error;
      },
    );
    loading.set(id, pending);
  }
  return pending;
}

export function preloadTemplate(id: PortfolioTemplateId): void {
  loadTemplate(id).catch(() => {});
}

// Draws at once when the code is already here (a preload counts); React.lazy suspends first anyway.
export const LazyTemplate = memo(function LazyTemplate({
  id,
  ...page
}: PortfolioTemplateProps & { id: PortfolioTemplateId }) {
  const Template = loaded.get(id) ?? use(loadTemplate(id));
  return <Template {...page} />;
});
