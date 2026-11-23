import { designFaces } from "../faces";
import { Gochi_Hand, Shantell_Sans } from "next/font/google";

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

export const designFonts = designFaces({
  "--pf-font-gochi": gochiHand,
  "--pf-font-shantell": shantellSans,
});
