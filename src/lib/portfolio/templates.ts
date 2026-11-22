import type { PortfolioTemplateId } from "./types";

export type PortfolioTemplateInfo = {
  id: PortfolioTemplateId;
  name: string;
  description: string;
  thumbnail: string;
  // For the browser bar and the OG card (Satori can't read CSS).
  colors: { background: string; ink: string; muted: string };
  credit: { author: string; work: string; href: string; licence: "MIT" };
};

export const PORTFOLIO_TEMPLATE_INFO: Record<PortfolioTemplateId, PortfolioTemplateInfo> = {
  navy: {
    id: "navy",
    name: "Navy",
    description: "Dark navy page with numbered sections, job tabs and big featured projects.",
    thumbnail: "/portfolio-templates/navy.webp",
    colors: { background: "#0a192f", ink: "#ccd6f6", muted: "#8892b0" },
    credit: {
      author: "Brittany Chiang",
      work: "v4",
      href: "https://github.com/bchiang7/v4",
      licence: "MIT",
    },
  },
  dock: {
    id: "dock",
    name: "Dock",
    description:
      "One calm column that fades in, with work rows, project cards and a floating dock.",
    thumbnail: "/portfolio-templates/dock.webp",
    colors: { background: "#ffffff", ink: "#0a0a0a", muted: "#737373" },
    credit: {
      author: "Dillion Verma",
      work: "portfolio",
      href: "https://github.com/dillionverma/portfolio",
      licence: "MIT",
    },
  },
  reel: {
    id: "reel",
    name: "Reel",
    description: "A huge rotating title over a 3D sphere, then each project in a device frame.",
    thumbnail: "/portfolio-templates/reel.webp",
    colors: { background: "#111111", ink: "#ffffff", muted: "#9a9a9a" },
    credit: {
      author: "Hamish Williams",
      work: "portfolio",
      href: "https://github.com/HamishMW/portfolio",
      licence: "MIT",
    },
  },
  bento: {
    id: "bento",
    name: "Bento",
    description: "Everything in tiles: intro, stack, live local time, GitHub and projects.",
    thumbnail: "/portfolio-templates/bento.webp",
    colors: { background: "#111111", ink: "#f7f7f7", muted: "#9a9a9a" },
    credit: {
      author: "Gianmarco Cavallo",
      work: "astro-bento-portfolio",
      href: "https://github.com/Ladvace/astro-bento-portfolio",
      licence: "MIT",
    },
  },
  cv: {
    id: "cv",
    name: "Blueprint",
    description: "A CV drawn to scale: ruled panels, your initials in 3D, jobs grouped by company.",
    thumbnail: "/portfolio-templates/cv.webp",
    colors: { background: "#ffffff", ink: "#09090b", muted: "#71717a" },
    credit: {
      author: "Chánh Đại",
      work: "chanhdai.com",
      href: "https://github.com/ncdai/chanhdai.com",
      licence: "MIT",
    },
  },
  prose: {
    id: "prose",
    name: "Prose",
    description: "Words first with colour chips, projects grouped by kind, then talks and writing.",
    thumbnail: "/portfolio-templates/prose.webp",
    colors: { background: "#ffffff", ink: "#222222", muted: "#888888" },
    credit: {
      author: "Anthony Fu",
      work: "antfu.me",
      href: "https://github.com/antfu/antfu.me",
      licence: "MIT",
    },
  },
  folio: {
    id: "folio",
    name: "Notes",
    description:
      "Your page as a notes app: a pinned about note and quick links, then a note for each part of your work.",
    thumbnail: "/portfolio-templates/folio.webp",
    colors: { background: "#ffffff", ink: "#333333", muted: "#737373" },
    credit: {
      author: "Alana Goyal",
      work: "alanagoyal",
      href: "https://github.com/alanagoyal/alanagoyal",
      licence: "MIT",
    },
  },
  paper: {
    id: "paper",
    name: "Paper",
    description:
      "A warm paper page: halftone initials, numbered sections, a bookshelf, a live clock.",
    thumbnail: "/portfolio-templates/paper.webp",
    colors: { background: "#fcfbf9", ink: "#201e1b", muted: "#7a7873" },
    credit: {
      author: "Cali Castle",
      work: "cali.so",
      href: "https://github.com/CaliCastle/cali.so",
      licence: "MIT",
    },
  },
};

export type TemplateGroup = { label: string; ids: PortfolioTemplateId[] };

const PICKER_GROUPS: readonly { label: string; ids: readonly PortfolioTemplateId[] }[] = [
  { label: "Showpieces", ids: ["reel", "bento", "navy", "dock"] },
  { label: "Simple and clean", ids: ["paper", "folio", "prose", "cv"] },
];

export function templateGroups(ids: readonly PortfolioTemplateId[]): TemplateGroup[] {
  const groups = PICKER_GROUPS.map(({ label, ids: listed }) => ({
    label,
    ids: listed.filter((id) => ids.includes(id)),
  }));
  const placed = new Set(groups.flatMap((group) => group.ids));
  groups.at(-1)?.ids.push(...ids.filter((id) => !placed.has(id)));
  return groups.filter((group) => group.ids.length > 0);
}

export function templateOrder(ids: readonly PortfolioTemplateId[]): PortfolioTemplateId[] {
  return templateGroups(ids).flatMap((group) => group.ids);
}
