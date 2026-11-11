import {
  DESIGN_ACCENTS,
  DESIGN_DENSITIES,
  DESIGN_FONTS,
  type DesignAccent,
  type DesignDensity,
  type DesignFont,
  type Resume,
  type ResumeDesign,
} from "@/lib/resume/schema";
import { PDF_FONT, type PdfFontName } from "./fonts";

export const ACCENT_COLORS: Record<DesignAccent, string> = {
  ink: "#1b1b1b",
  forest: "#0e3b2e",
  navy: "#1d3557",
  burgundy: "#6b1d2a",
  slate: "#3b4a5a",
};

export const ACCENT_LABELS: Record<DesignAccent, string> = {
  ink: "Ink",
  forest: "Forest",
  navy: "Navy",
  burgundy: "Burgundy",
  slate: "Slate",
};

export const FONT_LABELS: Record<DesignFont, string> = { sans: "Sans", serif: "Serif" };

export const DENSITY_LABELS: Record<DesignDensity, string> = {
  normal: "Normal",
  compact: "Compact",
};

export const FONT_FAMILIES: Record<DesignFont, { pdf: PdfFontName; word: string }> = {
  sans: { pdf: PDF_FONT.carlito, word: "Calibri" },
  serif: { pdf: PDF_FONT.tinos, word: "Times New Roman" },
};

export const COMPACT_SPACING = 0.9;
export const COMPACT_LINE_HEIGHT = 0.93;
export const MIN_LINE_HEIGHT = 1.15;

const isOneOf = <T extends string>(list: readonly T[], value: unknown): value is T =>
  typeof value === "string" && (list as readonly string[]).includes(value);

export function designOf(resume: Pick<Resume, "design">): ResumeDesign {
  const design = resume.design;
  if (!design || typeof design !== "object") return {};
  const out: ResumeDesign = {};
  if (isOneOf(DESIGN_ACCENTS, design.accent)) out.accent = design.accent;
  if (isOneOf(DESIGN_FONTS, design.font)) out.font = design.font;
  if (isOneOf(DESIGN_DENSITIES, design.density)) out.density = design.density;
  return out;
}

export function withDesign(resume: Resume, patch: Partial<ResumeDesign>): Resume {
  const next: ResumeDesign = { ...designOf(resume), ...patch };
  for (const key of Object.keys(next) as (keyof ResumeDesign)[]) {
    if (next[key] === undefined) delete next[key];
  }
  if (Object.keys(next).length > 0) return { ...resume, design: next };
  const copy = { ...resume };
  delete copy.design;
  return copy;
}

export function sameDesign(a: ResumeDesign, b: ResumeDesign): boolean {
  return a.accent === b.accent && a.font === b.font && a.density === b.density;
}

export function designKey(resume: Pick<Resume, "design">): string {
  const { accent, font, density } = designOf(resume);
  return [accent ?? "-", font ?? "-", density ?? "-"].join("/");
}
