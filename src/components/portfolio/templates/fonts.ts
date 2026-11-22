import {
  Abril_Fatface,
  Caveat,
  DM_Mono,
  DM_Serif_Display,
  Figtree,
  Fira_Code,
  Geist,
  Geist_Mono,
  Geist_Pixel,
  Gochi_Hand,
  Inter,
  Montserrat,
  Old_Standard_TT,
  Outfit,
  Poppins,
  Righteous,
  Roboto_Condensed,
  Sanchez,
  Shantell_Sans,
  UnifrakturMaguntia,
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
const gochiHand = Gochi_Hand({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  preload: false,
  variable: "--pf-font-gochi",
});
const shantellSans = Shantell_Sans({
  subsets: ["latin", "latin-ext"],
  axes: ["BNCE", "INFM", "SPAC"],
  display: "swap",
  preload: false,
  variable: "--pf-font-shantell",
});
const robotoCondensed = Roboto_Condensed({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
  variable: "--pf-font-roboto-condensed",
});

const unifraktur = UnifrakturMaguntia({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  preload: false,
  variable: "--pf-font-unifraktur",
});
const abrilFatface = Abril_Fatface({
  subsets: ["latin", "latin-ext"],
  weight: "400",
  display: "swap",
  preload: false,
  variable: "--pf-font-abril",
});
const oldStandard = Old_Standard_TT({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
  variable: "--pf-font-old-standard",
});
const outfit = Outfit({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
  variable: "--pf-font-outfit",
});
const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin", "latin-ext"],
  weight: "400",
  display: "swap",
  preload: false,
  variable: "--pf-font-dm-serif",
});
const sanchez = Sanchez({
  subsets: ["latin", "latin-ext"],
  weight: "400",
  display: "swap",
  preload: false,
  variable: "--pf-font-sanchez",
});
const righteous = Righteous({
  subsets: ["latin", "latin-ext"],
  weight: "400",
  display: "swap",
  preload: false,
  variable: "--pf-font-righteous",
});
const poppins = Poppins({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
  preload: false,
  variable: "--pf-font-poppins",
});

const TEMPLATE_FONTS: Record<PortfolioTemplateId, string> = {
  navy: `${inter.variable} ${firaCode.variable}`,
  dock: geist.variable,
  reel: montserrat.variable,
  bento: `${figtree.variable} ${geistPixel.variable}`,
  cv: `${geist.variable} ${geistMono.variable} ${caveat.variable}`,
  prose: `${inter.variable} ${dmMono.variable} ${robotoCondensed.variable}`,
  folio: inter.variable,
  paper: `${gochiHand.variable} ${shantellSans.variable}`,
  gazette: `${unifraktur.variable} ${abrilFatface.variable} ${oldStandard.variable} ${caveat.variable}`,
  terminal: firaCode.variable,
  brutal: `${outfit.variable} ${dmSerifDisplay.variable} ${sanchez.variable} ${poppins.variable} ${righteous.variable}`,
  card: poppins.variable,
};

export function templateFontClasses(id: PortfolioTemplateId): string {
  return TEMPLATE_FONTS[id];
}
