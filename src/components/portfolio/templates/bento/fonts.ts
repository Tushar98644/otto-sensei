import { designFaces } from "../faces";
import { Figtree, Geist_Pixel } from "next/font/google";

const figtree = Figtree({
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
  variable: "--pf-font-figtree",
});

// No metrics exist to size a fallback for it, so it names the stack Bento already falls back to.
const geistPixel = Geist_Pixel({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
  fallback: ["ui-monospace", "monospace"],
  variable: "--pf-font-geist-pixel",
});

export const designFonts = designFaces({
  "--pf-font-figtree": figtree,
  "--pf-font-geist-pixel": geistPixel,
});
