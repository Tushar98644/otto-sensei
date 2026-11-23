import { designFaces } from "../faces";
import { Geist_Mono } from "next/font/google";
import { caveat } from "../typefaces/caveat";
import { geist } from "../typefaces/geist";

const geistMono = Geist_Mono({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
  variable: "--pf-font-geist-mono",
});

export const designFonts = designFaces({
  "--pf-font-geist": geist,
  "--pf-font-geist-mono": geistMono,
  "--pf-font-caveat": caveat,
});
