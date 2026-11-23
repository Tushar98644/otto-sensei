import { EB_Garamond, Inter } from "next/font/google";
import { SiteFontVariables } from "./site-font-variables";

// Not preloaded: not-found pages are part of every page's build, and a preload here would reach /p too.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-inter",
});
const garamond = EB_Garamond({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-garamond",
});

export function NotFoundFonts() {
  return <SiteFontVariables sans={inter.style.fontFamily} display={garamond.style.fontFamily} />;
}
