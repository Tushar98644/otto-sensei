// Free, embeddable stand-ins for the fonts the source layouts use; files and licences live in
// public/fonts/pdf (THIRD_PARTY_NOTICES.md). react-pdf free: src/components/pdf/fonts.ts registers
// them.

export const PDF_FONT = {
  carlito: "Carlito",
  tinos: "Tinos",
  cmu: "CMU Serif",
  pagella: "TeX Gyre Pagella",
  roboto: "Roboto",
  sourceSans: "Source Sans 3",
  charis: "Charis",
} as const;

export type PdfFontName = (typeof PDF_FONT)[keyof typeof PDF_FONT];

export type PdfFontFace = {
  file: string;
  weight: 300 | 400 | 700;
  style: "normal" | "italic";
};

export type PdfFontFamily = {
  dir: string;
  faces: readonly PdfFontFace[];
  // The font Word ships with the same widths (Calibri, Times New Roman, Palatino), else this
  // family.
  word: string;
  // So a machine without the font substitutes a serif for a serif.
  wordClass: "roman" | "swiss";
  css: string;
  // Draws what this family has no glyph for. Null for the two broad families every chain ends in.
  fallback: PdfFontName | null;
};

const face = (file: string, weight: PdfFontFace["weight"] = 400, italic = false): PdfFontFace => ({
  file,
  weight,
  style: italic ? "italic" : "normal",
});

export const PDF_FONT_FAMILIES: Record<PdfFontName, PdfFontFamily> = {
  Carlito: {
    dir: "carlito",
    faces: [
      face("Carlito-Regular.ttf"),
      face("Carlito-Bold.ttf", 700),
      face("Carlito-Italic.ttf", 400, true),
    ],
    word: "Calibri",
    wordClass: "swiss",
    css: 'Carlito, Calibri, "Segoe UI", Helvetica, Arial, sans-serif',
    fallback: PDF_FONT.roboto,
  },
  Tinos: {
    dir: "tinos",
    faces: [
      face("Tinos-Regular.ttf"),
      face("Tinos-Bold.ttf", 700),
      face("Tinos-Italic.ttf", 400, true),
    ],
    word: "Times New Roman",
    wordClass: "roman",
    css: 'Tinos, "Times New Roman", Times, serif',
    fallback: null,
  },
  "CMU Serif": {
    dir: "cmu-serif",
    faces: [face("cmunrm.ttf"), face("cmunbx.ttf", 700), face("cmunti.ttf", 400, true)],
    word: "CMU Serif",
    wordClass: "roman",
    css: '"CMU Serif", "Latin Modern Roman", "Computer Modern", "Times New Roman", serif',
    fallback: PDF_FONT.tinos,
  },
  "TeX Gyre Pagella": {
    dir: "tex-gyre-pagella",
    // Upstream ships only OpenType (CFF) files; react-pdf embeds them like a .ttf.
    faces: [
      face("texgyrepagella-regular.otf"),
      face("texgyrepagella-bold.otf", 700),
      face("texgyrepagella-italic.otf", 400, true),
    ],
    word: "Palatino Linotype",
    wordClass: "roman",
    css: '"TeX Gyre Pagella", Palatino, "Palatino Linotype", "Book Antiqua", serif',
    fallback: PDF_FONT.tinos,
  },
  Roboto: {
    dir: "roboto",
    faces: [
      face("Roboto-Light.ttf", 300),
      face("Roboto-Regular.ttf"),
      face("Roboto-Bold.ttf", 700),
      face("Roboto-Italic.ttf", 400, true),
    ],
    word: "Roboto",
    wordClass: "swiss",
    css: 'Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif',
    fallback: null,
  },
  "Source Sans 3": {
    dir: "source-sans-3",
    faces: [
      face("SourceSans3-Light.ttf", 300),
      face("SourceSans3-Regular.ttf"),
      face("SourceSans3-Bold.ttf", 700),
      face("SourceSans3-LightIt.ttf", 300, true),
    ],
    word: "Source Sans 3",
    wordClass: "swiss",
    css: '"Source Sans 3", "Source Sans Pro", "Segoe UI", Helvetica, Arial, sans-serif',
    fallback: PDF_FONT.roboto,
  },
  Charis: {
    dir: "charis",
    faces: [
      face("Charis-Regular.ttf"),
      face("Charis-Bold.ttf", 700),
      face("Charis-Italic.ttf", 400, true),
    ],
    word: "Charis",
    wordClass: "roman",
    css: 'Charis, "Charis SIL", Charter, "Bitstream Charter", Georgia, serif',
    fallback: PDF_FONT.tinos,
  },
};

export const PDF_FONT_NAMES = Object.keys(PDF_FONT_FAMILIES) as PdfFontName[];

export function isPdfFont(value: unknown): value is PdfFontName {
  return typeof value === "string" && value in PDF_FONT_FAMILIES;
}

/** react-pdf allows a fallback list, whose first entry draws. */
export function primaryFont(value: unknown): PdfFontName | null {
  const first = Array.isArray(value) ? value[0] : value;
  return isPdfFont(first) ? first : null;
}

export function cssFontFamily(value: unknown): string {
  return PDF_FONT_FAMILIES[primaryFont(value) ?? PDF_FONT.carlito].css;
}

/** Small capitals are the only OpenType feature formats use. */
export function cssFontCaps(features: unknown): "small-caps" | undefined {
  return Array.isArray(features) && features.includes("smcp") ? "small-caps" : undefined;
}
