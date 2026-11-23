import { designFaces } from "../faces";
import { Lilita_One, Sora } from "next/font/google";

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

export const designFonts = designFaces({
  "--pf-font-lilita": lilitaOne,
  "--pf-font-sora": sora,
});
