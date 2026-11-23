import { designFaces } from "../faces";
import { DM_Serif_Display, Outfit, Righteous, Sanchez } from "next/font/google";
import { poppins } from "../typefaces/poppins";

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

export const designFonts = designFaces({
  "--pf-font-outfit": outfit,
  "--pf-font-dm-serif": dmSerifDisplay,
  "--pf-font-sanchez": sanchez,
  "--pf-font-poppins": poppins,
  "--pf-font-righteous": righteous,
});
