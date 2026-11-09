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

// The templates' typefaces, self-hosted by next/font. Imported only by /p/<slug> and the editor's
// preview, so no other screen carries them. Each sets a --pf-font-* variable the template's
// stylesheet reads, and only the chosen template's variables go on the element around it. No
// preloading: the browser fetches just the files that template's CSS uses.
//
// Stand-ins for fonts the originals don't let us ship: Inter and Fira Code for v4's Calibre and
// SF Mono (Navy), Montserrat for Hamish's Gotham (Reel), Figtree for Satoshi and Cabinet Grotesk
// (Bento). The rest use their originals' own free fonts: Geist (Dock), Geist Mono and Geist Pixel
// (CV), Inter, DM Mono and Roboto Condensed (Prose), Inter (Folio), Geist and Geist Mono (Paper).

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
  bento: figtree.variable,
  cv: `${geistMono.variable} ${geistPixel.variable}`,
  prose: `${inter.variable} ${dmMono.variable} ${robotoCondensed.variable}`,
  folio: inter.variable,
  paper: `${geist.variable} ${geistMono.variable}`,
};

/** The font variables one template reads, for the element that wraps it. */
export function templateFontClasses(id: PortfolioTemplateId): string {
  return TEMPLATE_FONTS[id];
}
