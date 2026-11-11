import {
  DM_Mono,
  Figtree,
  Fira_Code,
  Geist,
  Geist_Mono,
  Geist_Pixel,
  Inter,
  Montserrat,
  Roboto_Condensed,
} from "next/font/google";
import type { PortfolioTemplateId } from "@/lib/portfolio/types";

// Only /p/<slug> and the editor's preview import these, and only the chosen template's variables
// go on its wrapper; no preloading, so the browser fetches just the files its CSS uses.
// Stand-ins for fonts we can't ship: Inter and Fira Code (Navy's Calibre, SF Mono), Montserrat
// (Reel's Gotham), Figtree (Bento's Satoshi, Cabinet Grotesk).

// Options must be written out in each call: next/font reads them at build time as literals.
const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
  variable: "--pf-font-inter",
});
const firaCode = Fira_Code({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
  variable: "--pf-font-fira-code",
});
const geist = Geist({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
  variable: "--pf-font-geist",
});
const montserrat = Montserrat({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
  variable: "--pf-font-montserrat",
});
const figtree = Figtree({
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
  variable: "--pf-font-figtree",
});

const geistMono = Geist_Mono({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
  variable: "--pf-font-geist-mono",
});
const geistPixel = Geist_Pixel({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
  variable: "--pf-font-geist-pixel",
});
const dmMono = DM_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["400"],
  display: "swap",
  preload: false,
  variable: "--pf-font-dm-mono",
});
const robotoCondensed = Roboto_Condensed({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
  variable: "--pf-font-roboto-condensed",
});

const TEMPLATE_FONTS: Record<PortfolioTemplateId, string> = {
  navy: `${inter.variable} ${firaCode.variable}`,
  dock: geist.variable,
  reel: montserrat.variable,
  // Geist Pixel draws the initials where the original has a pixelated portrait.
  bento: `${figtree.variable} ${geistPixel.variable}`,
  cv: `${geistMono.variable} ${geistPixel.variable}`,
  prose: `${inter.variable} ${dmMono.variable} ${robotoCondensed.variable}`,
  folio: inter.variable,
  paper: `${geist.variable} ${geistMono.variable}`,
};

export function templateFontClasses(id: PortfolioTemplateId): string {
  return TEMPLATE_FONTS[id];
}
