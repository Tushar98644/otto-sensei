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
    name: "Sketchbook",
    description:
      "Drawn by hand: your name in marker over a fox by the sea, inked cards and wavy underlines, by day or night.",
    thumbnail: "/portfolio-templates/paper.webp",
    colors: { background: "#e9f4fd", ink: "#14273d", muted: "#4d6379" },
    credit: {
      author: "umutxyp",
      work: "Personal-Website",
      href: "https://github.com/umutxyp/Personal-Website",
      licence: "MIT",
    },
  },
  gazette: {
    id: "gazette",
    name: "Gazette",
    description:
      "Your page as a 1926 broadsheet: a blackletter masthead, your headline, ruled columns and a ticker.",
    thumbnail: "/portfolio-templates/gazette.webp",
    colors: { background: "#f2ead8", ink: "#1c1710", muted: "#5c5240" },
    credit: {
      author: "Joaquín Godoy",
      work: "portfolio-v2",
      href: "https://github.com/JoaccoG/portfolio-v2",
      licence: "MIT",
    },
  },
  terminal: {
    id: "terminal",
    name: "Terminal",
    description:
      "A terminal that prints your summary as it opens, then lets visitors type help, work or contact.",
    thumbnail: "/portfolio-templates/terminal.webp",
    colors: { background: "#fbf1c9", ink: "#3c3836", muted: "#7c6f64" },
    credit: {
      author: "Vincent Wu",
      work: "LiveTerm",
      href: "https://github.com/Cveinnt/LiveTerm",
      licence: "MIT",
    },
  },
  brutal: {
    id: "brutal",
    name: "Brutal",
    description:
      "Loud colour blocks with thick black borders, hard shadows that press in, and pill tags.",
    thumbnail: "/portfolio-templates/brutal.webp",
    colors: { background: "#f9a8d4", ink: "#000000", muted: "#3f3f46" },
    credit: {
      author: "Elian Van Cutsem",
      work: "brutal",
      href: "https://github.com/ElianCodes/brutal",
      licence: "MIT",
    },
  },
  card: {
    id: "card",
    name: "Card",
    description:
      "One card on charcoal: a profile sidebar beside tabs for about, resume and work, picked out in gold.",
    thumbnail: "/portfolio-templates/card.webp",
    colors: { background: "#121212", ink: "#fafafa", muted: "#a3a3a3" },
    credit: {
      author: "codewithsadee",
      work: "vcard-personal-portfolio",
      href: "https://github.com/codewithsadee/vcard-personal-portfolio",
      licence: "MIT",
    },
  },
};

export type TemplateGroup = { label: string; ids: PortfolioTemplateId[] };

const PICKER_GROUPS: readonly { label: string; ids: readonly PortfolioTemplateId[] }[] = [
  { label: "Our picks", ids: ["paper", "dock", "reel"] },
  {
    label: "More designs",
    ids: ["folio", "cv", "prose", "gazette", "card", "brutal", "terminal", "bento", "navy"],
  },
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
