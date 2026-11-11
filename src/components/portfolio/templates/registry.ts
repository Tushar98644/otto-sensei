import { PORTFOLIO_TEMPLATE_INFO } from "@/lib/portfolio/templates";
import { PORTFOLIO_TEMPLATE_IDS, type PortfolioTemplateId } from "@/lib/portfolio/types";
import { BentoTemplate } from "./bento/bento";
import { CvTemplate } from "./cv/cv";
import { DockTemplate } from "./dock/dock";
import { FolioTemplate } from "./folio/folio";
import { NavyTemplate } from "./navy/navy";
import { PaperTemplate } from "./paper/paper";
import { ProseTemplate } from "./prose/prose";
import { ReelTemplate } from "./reel/reel";
import type { PortfolioTemplate } from "./types";

export const PORTFOLIO_TEMPLATES: Record<PortfolioTemplateId, PortfolioTemplate> = {
  navy: { ...PORTFOLIO_TEMPLATE_INFO.navy, Component: NavyTemplate },
  dock: { ...PORTFOLIO_TEMPLATE_INFO.dock, Component: DockTemplate },
  reel: { ...PORTFOLIO_TEMPLATE_INFO.reel, Component: ReelTemplate },
  bento: { ...PORTFOLIO_TEMPLATE_INFO.bento, Component: BentoTemplate },
  cv: { ...PORTFOLIO_TEMPLATE_INFO.cv, Component: CvTemplate },
  prose: { ...PORTFOLIO_TEMPLATE_INFO.prose, Component: ProseTemplate },
  folio: { ...PORTFOLIO_TEMPLATE_INFO.folio, Component: FolioTemplate },
  paper: { ...PORTFOLIO_TEMPLATE_INFO.paper, Component: PaperTemplate },
};

export const PORTFOLIO_TEMPLATE_LIST: readonly PortfolioTemplate[] = PORTFOLIO_TEMPLATE_IDS.map(
  (id) => PORTFOLIO_TEMPLATES[id],
);
