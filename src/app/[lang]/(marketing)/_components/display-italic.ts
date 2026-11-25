import { EB_Garamond } from "next/font/google";

// Only these headings (all weight 400) set a phrase in italic, so only their pages preload this face: the static 400 file, half the variable one's size.
export const displayItalic = EB_Garamond({
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  display: "swap",
  fallback: ["ui-serif", "Georgia", "serif"],
});
