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

// The look settings on top of a format: what they're called and what they print as. Client-safe
// and react-pdf free, so the Download step's controls and the Word export share them with the PDF
// (src/components/pdf/design.ts applies them to a theme).

// Print colors, not app colors: dark enough for 7:1 on white paper, so headings in any of them read
// like ink to people and are plain text to hiring software.
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

// "Sans" and "Serif" swap a format's own fonts for two broad bundled families, and the Word fonts
// that match their widths (Carlito is metric-compatible with Calibri, Tinos with Times New Roman),
// so a page breaks in about the same place in both files.
export const FONT_FAMILIES: Record<DesignFont, { pdf: PdfFontName; word: string }> = {
  sans: { pdf: PDF_FONT.carlito, word: "Calibri" },
  serif: { pdf: PDF_FONT.tinos, word: "Times New Roman" },
};

// Compact takes about 10% off the page: margins and gaps shrink by a tenth and lines sit a little
// closer, but type stays the same size, so nothing gets harder to read.
export const COMPACT_SPACING = 0.9;
export const COMPACT_LINE_HEIGHT = 0.93;
export const MIN_LINE_HEIGHT = 1.15;

const isOneOf = <T extends string>(list: readonly T[], value: unknown): value is T =>
  typeof value === "string" && (list as readonly string[]).includes(value);

/** The resume's look settings, each one checked: copies in localStorage are never re-parsed. */
export function designOf(resume: Pick<Resume, "design">): ResumeDesign {
  const design = resume.design;
  if (!design || typeof design !== "object") return {};
  const out: ResumeDesign = {};
  if (isOneOf(DESIGN_ACCENTS, design.accent)) out.accent = design.accent;
  if (isOneOf(DESIGN_FONTS, design.font)) out.font = design.font;
  if (isOneOf(DESIGN_DENSITIES, design.density)) out.density = design.density;
  return out;
}

/**
 * Sets look settings; `undefined` puts one back to the format's own choice. A resume with none left
 * drops `design` entirely, so it prints exactly like one saved before the settings existed.
 */
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

/** A stable string for cache keys: "navy/serif/compact", "-/-/-" when nothing is set. */
export function designKey(resume: Pick<Resume, "design">): string {
  const { accent, font, density } = designOf(resume);
  return [accent ?? "-", font ?? "-", density ?? "-"].join("/");
}
