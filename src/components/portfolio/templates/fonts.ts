import {
  Abril_Fatface,
  Anton,
  Caveat,
  DM_Mono,
  DM_Serif_Display,
  Figtree,
  Fira_Code,
  Geist,
  Geist_Mono,
  Geist_Pixel,
  Gochi_Hand,
  IBM_Plex_Mono,
  IBM_Plex_Sans,
  Inter,
  JetBrains_Mono,
  Lilita_One,
  Montserrat,
  Old_Standard_TT,
  Outfit,
  Poppins,
  Righteous,
  Roboto_Condensed,
  Sanchez,
  Shantell_Sans,
  Sora,
  Source_Serif_4,
  Space_Grotesk,
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

const plexMono = IBM_Plex_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  display: "swap",
  preload: false,
  variable: "--pf-font-plex-mono",
});
const plexSans = IBM_Plex_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  display: "swap",
  preload: false,
  variable: "--pf-font-plex-sans",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
  variable: "--pf-font-jetbrains",
});
const sourceSerif = Source_Serif_4({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600"],
  display: "swap",
  preload: false,
  variable: "--pf-font-source-serif",
});
const anton = Anton({
  subsets: ["latin", "latin-ext"],
  weight: "400",
  display: "swap",
  preload: false,
  variable: "--pf-font-anton",
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
  variable: "--pf-font-space-grotesk",
});
const lilitaOne = Lilita_One({
  subsets: ["latin", "latin-ext"],
  weight: "400",
  display: "swap",
  preload: false,
  variable: "--pf-font-lilita",
});
const sora = Sora({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
  variable: "--pf-font-sora",
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
  retro: `${plexMono.variable} ${plexSans.variable} ${jetbrainsMono.variable} ${sourceSerif.variable} ${inter.variable}`,
  starring: `${anton.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`,
  bubble: `${lilitaOne.variable} ${sora.variable}`,
};

export function templateFontClasses(id: PortfolioTemplateId): string {
  return TEMPLATE_FONTS[id];
}
