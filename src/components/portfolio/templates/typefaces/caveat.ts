import { Caveat } from "next/font/google";

export const caveat = Caveat({
  subsets: ["latin", "latin-ext"],
  weight: ["400"],
  display: "swap",
  preload: false,
  variable: "--pf-font-caveat",
});
