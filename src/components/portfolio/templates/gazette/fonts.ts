import { designFaces } from "../faces";
import { Abril_Fatface, Old_Standard_TT, UnifrakturMaguntia } from "next/font/google";
import { caveat } from "../typefaces/caveat";

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

export const designFonts = designFaces({
  "--pf-font-unifraktur": unifraktur,
  "--pf-font-abril": abrilFatface,
  "--pf-font-old-standard": oldStandard,
  "--pf-font-caveat": caveat,
});
