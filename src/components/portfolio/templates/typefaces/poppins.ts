import { Poppins } from "next/font/google";

export const poppins = Poppins({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
  preload: false,
  variable: "--pf-font-poppins",
});
