import type { Styles } from "@react-pdf/renderer";
import { PDF_FONT } from "@/lib/pdf/fonts";

// A format is a set of options for the one shared layout (./layout.ts plans it, ./document.tsx
// draws it), never a layout of its own: one column, real text in reading order, the person's
// headings, nothing drawn but lines and bullet marks. That keeps every format as readable to hiring
// software as the others, and the page-break rules written once.
//
// Sizes are in points (72 per inch). Fonts are the bundled families in @/lib/pdf/fonts. Letter
// spacing stays at 0.8pt or less everywhere: wider, and text extraction (pdf.js, and the hiring
// software built like it) reads "S U M M A R Y".

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
  // With `headlineInline`: the " | Headline" printed after the name on its line.
  headlineInline: PdfStyle;
  contact: PdfStyle;
  contactNext: PdfStyle;
  // Email and plain contact items.
  link: PdfStyle;
  // Web addresses (LinkedIn, GitHub, a portfolio), in the contact lines and on projects.
  webLink: PdfStyle;
  // Drawn under the header when `headerRule` is on.
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
  // An entry's heading rows (see EntryRow). Each row is a view (`rowN`) holding the lead text
  // (`rowNText`, its first field `rowNFirst`, the others `rowNRest`) and the side text (`rowNSide`).
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
  // A drawn bullet (a square or ring), when the font has no glyph for it.
  bulletMark: PdfStyle;
  bulletText: PdfStyle;
  skillLine: PdfStyle;
  skillLabel: PdfStyle;
  skillItems: PdfStyle;
};

export type StyleSlot = keyof ThemeStyles;

// The parts an entry heading is built from. `detail` is a location or a project link; `tech` a
// project's tools.
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
  // A row whose first field is empty folds into one line: lead fields, then the dates on the right.
  rows: Record<EntryKind, readonly EntryRow[]>;
  // Two or more roles in a row at one company. With companyRow, the company prints once on that
  // row (org, detail, and the run's whole span as dates) and every role on roleRow. Without it, the
  // first role prints its full rows and later roles roleRow. roleRow uses the row2 styles.
  companyRow?: EntryRow;
  roleRow: EntryRow;
  // Printed before a lead field that follows another. Punctuation before the space joins the
  // field in front (", " puts the comma on the bold company name).
  separators: Partial<Record<EntryField, string>>;
  // below: a full-width rule under the heading. above: one over it. after: a rule from the end of
  // the heading to the margin.
  headingRule: "none" | "below" | "above" | "after";
  headingAccent: number;
  headerRule: boolean;
  nameSplit: boolean;
  headlineInline: boolean;
  // "years" prints "2019 – 2022" for "Mar 2019 – Feb 2022"; text with no year stays as written.
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
