import { designFaces } from "../faces";
import { Anton, Space_Grotesk } from "next/font/google";
import { jetbrainsMono } from "../typefaces/jetbrains-mono";

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

export const designFonts = designFaces({
  "--pf-font-anton": anton,
  "--pf-font-space-grotesk": spaceGrotesk,
  "--pf-font-jetbrains": jetbrainsMono,
});
