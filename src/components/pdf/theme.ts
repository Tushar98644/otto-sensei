import type { Styles } from "@react-pdf/renderer";
import { PDF_FONT } from "@/lib/pdf/fonts";

// A format is options for the one shared layout, never a layout of its own, so every format reads
// the same to hiring software. Sizes in points (72 per inch). Letter spacing stays ≤ 0.8pt: wider,
// and pdf.js-style text extraction reads "S U M M A R Y".

export type PdfStyle = Styles[string];

export const inch = (value: number) => value * 72;

export const INK = "#1a1a1a";
export const MUTED = "#4d4d4d";
export const RULE = "#b3b3b3";
export const MAX_LETTER_SPACING = 0.8;

export type ThemeStyles = {
  page: PdfStyle;
  header: PdfStyle;
  // The name line. With `nameSplit`, the first names take this and the last name `nameLast`.
  name: PdfStyle;
  nameLast: PdfStyle;
  headline: PdfStyle;
  headlineInline: PdfStyle;
  contact: PdfStyle;
  contactNext: PdfStyle;
  link: PdfStyle;
  // Web addresses (LinkedIn, GitHub, a portfolio), in the contact lines and on projects.
  webLink: PdfStyle;
  headerRule: PdfStyle;
  section: PdfStyle;
  sectionTitle: PdfStyle;
  // The first `headingAccent` letters of each heading.
  sectionTitleAccent: PdfStyle;
  // Only for headingRule "after": the row holding the title and the line that runs to the margin.
  sectionTitleRow: PdfStyle;
  sectionTitleRule: PdfStyle;
  paragraph: PdfStyle;
  // Above every entry but a section's first, and above a later role at the same company.
  entry: PdfStyle;
  role: PdfStyle;
  // Heading rows (see EntryRow): views rowN with rowNText (rowNFirst, rowNRest) and rowNSide.
  row1: PdfStyle;
  row1Text: PdfStyle;
  row1First: PdfStyle;
  row1Rest: PdfStyle;
  row1Side: PdfStyle;
  row2: PdfStyle;
  row2Text: PdfStyle;
  row2First: PdfStyle;
  row2Rest: PdfStyle;
  row2Side: PdfStyle;
  // A line of description under an entry's heading (items in extra sections).
  entryNote: PdfStyle;
  bullet: PdfStyle;
  // The box the bullet sits in: its width is the hanging indent.
  bulletGlyph: PdfStyle;
  bulletMark: PdfStyle;
  bulletText: PdfStyle;
  skillLine: PdfStyle;
  skillLabel: PdfStyle;
  skillItems: PdfStyle;
};

export type StyleSlot = keyof ThemeStyles;

// `detail` is a location or project link; `tech` a project's tools.
export type EntryField = "title" | "org" | "detail" | "dates" | "tech";

// One heading row: lead fields left to right (empty ones skipped), one field right-aligned.
export type EntryRow = { lead: readonly EntryField[]; side?: EntryField };

export type EntryKind = "job" | "school" | "item";

export type ContactField = "location" | "email" | "phone" | "links";

export type BulletSpec = {
  glyph: string;
  // Drawn instead when the bullet's font has no glyph for it (Carlito and CMU Serif lack "■").
  shape?: "square" | "circle";
};

// A slot whose color (and rule color) follows the accent; a number tints it toward white.
export type AccentSlot = StyleSlot | readonly [StyleSlot, number];

export type TemplateTheme = {
  styles: ThemeStyles;
  // Items in order, one array per line. Plain characters with a space each side between items,
  // so parsers keep them apart and react-pdf never breaks a line inside one.
  contactLines: readonly (readonly ContactField[])[];
  contactSeparator: string;
  bullet: BulletSpec;
  // True once the theme is resolved for a font without the bullet glyph (./design.ts).
  drawBullet?: boolean;
  // Points to move a bullet glyph down (or up, negative) in the PDF only: react-pdf sets a glyph
  // smaller or larger than the text off its middle, where a browser centres it.
  bulletOffset?: number;
  // Heading rows for jobs, schools and everything else (projects, certificates, extra sections).
  rows: Record<EntryKind, readonly EntryRow[]>;
  // A run of roles at one company. With companyRow the company prints once (org, detail, span)
  // and each role on roleRow (row2 styles); without it, the first role prints its full rows.
  companyRow?: EntryRow;
  roleRow: EntryRow;
  // Printed before a lead field that follows another. Punctuation before the space joins the
  // field in front (", " puts the comma on the bold company name).
  separators: Partial<Record<EntryField, string>>;
  // below/above: a full-width rule under/over the heading. after: from its end to the margin.
  headingRule: "none" | "below" | "above" | "after";
  headingAccent: number;
  headerRule: boolean;
  nameSplit: boolean;
  headlineInline: boolean;
  dates: "asWritten" | "years";
  // Skills as "Label: items" lines, or as bullets (the resume book's Additional Information).
  skills: "lines" | "bullets";
  accentSlots: readonly AccentSlot[];
};

// Structure every format shares; a format sets how it looks on top (defineTheme).
export const BASE_STYLES: ThemeStyles = {
  page: {
    paddingTop: inch(0.5),
    paddingBottom: inch(0.5),
    paddingHorizontal: inch(0.75),
    fontFamily: PDF_FONT.carlito,
    fontSize: 11,
    lineHeight: 1.2,
    color: INK,
  },
  header: { alignItems: "center" },
  name: { fontSize: 12, fontWeight: "bold", textAlign: "center" },
  nameLast: {},
  headline: { textAlign: "center" },
  headlineInline: {},
  contact: { textAlign: "center" },
  contactNext: { textAlign: "center" },
  link: { color: INK, textDecoration: "none" },
  webLink: { color: INK, textDecoration: "none" },
  headerRule: {},
  section: { marginTop: 12 },
  sectionTitle: { marginBottom: 2, fontWeight: "bold" },
  sectionTitleAccent: {},
  sectionTitleRow: { flexDirection: "row", alignItems: "center" },
  sectionTitleRule: { flex: 1 },
  // Spacing sits above each block. The first block of a section follows the heading margin instead.
  paragraph: { marginTop: 3 },
  entry: { marginTop: 8 },
  role: { marginTop: 4 },
  row1: { flexDirection: "row", justifyContent: "space-between" },
  row1Text: { flex: 1, paddingRight: 12 },
  row1First: { fontWeight: "bold" },
  row1Rest: {},
  row1Side: { flexShrink: 0, textAlign: "right" },
  row2: { flexDirection: "row", justifyContent: "space-between" },
  row2Text: { flex: 1, paddingRight: 12 },
  row2First: {},
  row2Rest: {},
  row2Side: { flexShrink: 0, textAlign: "right" },
  entryNote: { marginTop: 1 },
  bullet: { flexDirection: "row", marginTop: 1 },
  bulletGlyph: { width: 18, paddingLeft: 4 },
  bulletMark: { width: 3.5, height: 3.5 },
  bulletText: { flex: 1 },
  skillLine: { marginTop: 1 },
  skillLabel: { fontWeight: "bold" },
  skillItems: {},
};

export const BASE_THEME: TemplateTheme = {
  styles: BASE_STYLES,
  contactLines: [["location", "email", "phone", "links"]],
  contactSeparator: " • ",
  bullet: { glyph: "•" },
  rows: {
    job: [
      { lead: ["org"], side: "detail" },
      { lead: ["title"], side: "dates" },
    ],
    school: [
      { lead: ["org"], side: "detail" },
      { lead: ["title"], side: "dates" },
    ],
    item: [{ lead: ["title", "org", "tech", "detail"], side: "dates" }],
  },
  companyRow: { lead: ["org"], side: "detail" },
  roleRow: { lead: ["title", "detail"], side: "dates" },
  separators: { org: ", ", detail: ", ", tech: " | ", title: ", " },
  headingRule: "none",
  headingAccent: 0,
  headerRule: false,
  nameSplit: false,
  headlineInline: false,
  dates: "asWritten",
  skills: "lines",
  accentSlots: ["sectionTitle", "sectionTitleRule", "headerRule"],
};

type ThemeOverrides = Partial<Omit<TemplateTheme, "styles">> & {
  styles?: Partial<ThemeStyles>;
};

// Merged slot by slot, so the layout's structural styles (rows, flex, no-shrink dates) carry over
// and a theme lists only how it looks. Zero a base value to drop it (borderBottomWidth: 0).
export function defineTheme({ styles = {}, ...options }: ThemeOverrides): TemplateTheme {
  const merged = { ...BASE_STYLES };
  for (const key of Object.keys(styles) as StyleSlot[]) {
    merged[key] = { ...BASE_STYLES[key], ...styles[key] };
  }
  return { ...BASE_THEME, ...options, styles: merged };
}
