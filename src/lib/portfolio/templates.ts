import type { PortfolioTemplateId } from "./types";

// Pure and client-safe. The web templates' names, one-line ideas, picker pictures, page colours
// and design credits. The drawings live in the component registry (src/components/portfolio/
// templates/registry.ts); this file stays free of React so the server, the Open Graph image and
// tests can name a template.
//
// Every template rebuilds a real, MIT-licensed portfolio for our users' data. The licence asks
// for the original notice to travel with the code (each template folder's LICENSE.txt and
// THIRD_PARTY_NOTICES.md); pages show no credit line. The credit below records the source.

export type PortfolioTemplateInfo = {
  id: PortfolioTemplateId;
  name: string;
  description: string;
  // The picker's picture: the top of a static render at 1440px, a third of the size.
  thumbnail: string;
  // The page's own colours, for the browser bar and the Open Graph card (Satori can't read CSS).
  colors: { background: string; ink: string; muted: string };
  // Whose design it is. Never used as the template's name.
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
    name: "CV",
    description: "A clean one-page CV in mono type with icon links, ready to print.",
    thumbnail: "/portfolio-templates/cv.webp",
    colors: { background: "#fafaf8", ink: "#1c1b18", muted: "#76736f" },
    credit: {
      author: "Bartosz Jarocki",
      work: "cv",
      href: "https://github.com/BartoszJarocki/cv",
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
    name: "Folio",
    description: "A short intro, big project tiles, where you worked and your writing.",
    thumbnail: "/portfolio-templates/folio.webp",
    colors: { background: "#fdfdfc", ink: "#21201c", muted: "#63635e" },
    credit: {
      author: "Samuel Kraft",
      work: "samuelkraft-next",
      href: "https://github.com/samuelkraft/samuelkraft-next",
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

// The editor's design picker, in this order: the showpieces (3D, motion, live tiles) first, then
// the quieter pages. A design missing here still shows, at the end of the last group.
const PICKER_GROUPS: readonly { label: string; ids: readonly PortfolioTemplateId[] }[] = [
  { label: "Showpieces", ids: ["reel", "bento", "navy", "dock"] },
  { label: "Simple and clean", ids: ["paper", "folio", "prose", "cv"] },
];

/** Every design once, grouped for the picker, the premium ones first. */
export function templateGroups(ids: readonly PortfolioTemplateId[]): TemplateGroup[] {
  const groups = PICKER_GROUPS.map(({ label, ids: listed }) => ({
    label,
    ids: listed.filter((id) => ids.includes(id)),
  }));
  const placed = new Set(groups.flatMap((group) => group.ids));
  groups.at(-1)?.ids.push(...ids.filter((id) => !placed.has(id)));
  return groups.filter((group) => group.ids.length > 0);
}

/** The designs in picker order, for anything that steps through them or lists them all. */
export function templateOrder(ids: readonly PortfolioTemplateId[]): PortfolioTemplateId[] {
  return templateGroups(ids).flatMap((group) => group.ids);
}
