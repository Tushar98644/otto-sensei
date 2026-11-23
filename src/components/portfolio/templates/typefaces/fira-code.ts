import { Fira_Code } from "next/font/google";

export const firaCode = Fira_Code({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
  variable: "--pf-font-fira-code",
});
