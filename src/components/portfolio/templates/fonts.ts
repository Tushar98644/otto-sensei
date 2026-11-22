import {
  Caveat,
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
const caveat = Caveat({
  subsets: ["latin", "latin-ext"],
  weight: ["400"],
  display: "swap",
  preload: false,
  variable: "--pf-font-caveat",
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
  bento: `${figtree.variable} ${geistPixel.variable}`,
  cv: `${geist.variable} ${geistMono.variable} ${caveat.variable}`,
  prose: `${inter.variable} ${dmMono.variable} ${robotoCondensed.variable}`,
  folio: inter.variable,
  paper: `${geist.variable} ${geistMono.variable}`,
};

export function templateFontClasses(id: PortfolioTemplateId): string {
  return TEMPLATE_FONTS[id];
}
