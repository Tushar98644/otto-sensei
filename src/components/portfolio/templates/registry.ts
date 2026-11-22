import { PORTFOLIO_TEMPLATE_INFO } from "@/lib/portfolio/templates";
import { PORTFOLIO_TEMPLATE_IDS, type PortfolioTemplateId } from "@/lib/portfolio/types";
import { BentoTemplate } from "./bento/bento";
import { BrutalTemplate } from "./brutal/brutal";
import { CardTemplate } from "./card/card";
import { BubbleTemplate } from "./bubble/bubble";
import { CvTemplate } from "./cv/cv";
import { DockTemplate } from "./dock/dock";
import { FolioTemplate } from "./folio/folio";
import { GazetteTemplate } from "./gazette/gazette";
import { NavyTemplate } from "./navy/navy";
import { PaperTemplate } from "./paper/paper";
import { ProseTemplate } from "./prose/prose";
import { ReelTemplate } from "./reel/reel";
import { TerminalTemplate } from "./terminal/terminal";
import { RetroTemplate } from "./retro/retro";
import { StarringTemplate } from "./starring/starring";
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
  gazette: { ...PORTFOLIO_TEMPLATE_INFO.gazette, Component: GazetteTemplate },
  terminal: { ...PORTFOLIO_TEMPLATE_INFO.terminal, Component: TerminalTemplate },
  brutal: { ...PORTFOLIO_TEMPLATE_INFO.brutal, Component: BrutalTemplate },
  card: { ...PORTFOLIO_TEMPLATE_INFO.card, Component: CardTemplate },
  retro: { ...PORTFOLIO_TEMPLATE_INFO.retro, Component: RetroTemplate },
  starring: { ...PORTFOLIO_TEMPLATE_INFO.starring, Component: StarringTemplate },
  bubble: { ...PORTFOLIO_TEMPLATE_INFO.bubble, Component: BubbleTemplate },
};

export const PORTFOLIO_TEMPLATE_LIST: readonly PortfolioTemplate[] = PORTFOLIO_TEMPLATE_IDS.map(
  (id) => PORTFOLIO_TEMPLATES[id],
);
