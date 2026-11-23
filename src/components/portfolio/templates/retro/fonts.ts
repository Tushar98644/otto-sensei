import { designFaces } from "../faces";
import { IBM_Plex_Mono, IBM_Plex_Sans, Source_Serif_4 } from "next/font/google";
import { inter } from "../typefaces/inter";
import { jetbrainsMono } from "../typefaces/jetbrains-mono";

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

const sourceSerif = Source_Serif_4({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600"],
  display: "swap",
  preload: false,
  variable: "--pf-font-source-serif",
});

export const designFonts = designFaces({
  "--pf-font-plex-mono": plexMono,
  "--pf-font-plex-sans": plexSans,
  "--pf-font-jetbrains": jetbrainsMono,
  "--pf-font-source-serif": sourceSerif,
  "--pf-font-inter": inter,
});
