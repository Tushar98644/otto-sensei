import { designFaces } from "../faces";
import { DM_Mono, Roboto_Condensed } from "next/font/google";
import { inter } from "../typefaces/inter";

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

export const designFonts = designFaces({
  "--pf-font-inter": inter,
  "--pf-font-dm-mono": dmMono,
  "--pf-font-roboto-condensed": robotoCondensed,
});
