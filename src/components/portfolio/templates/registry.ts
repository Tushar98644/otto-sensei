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

// The one place the app finds a template. To drop in a new design: write its component (it gets
// only `view`, `content` and `footer`, see ./types.ts) in its own folder with a stylesheet scoped
// by ./css.ts, add its info, credit and picker picture in src/lib/portfolio/templates.ts, its
// fonts in ./fonts.ts and what it draws in src/lib/portfolio/content-uses.ts, and point its entry
// here; the editor, the picker and /p/<slug> follow. A new id also needs PORTFOLIO_TEMPLATE_IDS
// and a migration for the CHECK on portfolios.template.

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
