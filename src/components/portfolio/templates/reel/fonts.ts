import { designFaces } from "../faces";
import { Montserrat } from "next/font/google";

const montserrat = Montserrat({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
  variable: "--pf-font-montserrat",
});

export const designFonts = designFaces({
  "--pf-font-montserrat": montserrat,
});
