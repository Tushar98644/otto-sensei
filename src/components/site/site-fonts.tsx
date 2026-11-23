import { EB_Garamond, Inter } from "next/font/google";
import { SiteFontVariables } from "./site-font-variables";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });

// The italic face is declared only where headings use it: (marketing)/_components/display-italic.ts.
const garamond = EB_Garamond({ subsets: ["latin"], display: "swap", variable: "--font-garamond" });

// Each layout but /p's renders this, so public portfolios (drawn in their design's fonts) preload neither face.
export function SiteFonts() {
  return <SiteFontVariables sans={inter.style.fontFamily} display={garamond.style.fontFamily} />;
}
