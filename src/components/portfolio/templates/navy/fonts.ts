import { designFaces } from "../faces";
import { firaCode } from "../typefaces/fira-code";
import { inter } from "../typefaces/inter";

export const designFonts = designFaces({
  "--pf-font-inter": inter,
  "--pf-font-fira-code": firaCode,
});
