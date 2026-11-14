import { EB_Garamond } from "next/font/google";

// Only these headings set a phrase in italic, so only their pages load and preload this face.
export const displayItalic = EB_Garamond({
  subsets: ["latin"],
  style: "italic",
  display: "swap",
  fallback: ["ui-serif", "Georgia", "serif"],
});
