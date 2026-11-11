import type { Styles } from "@react-pdf/renderer";
import { PDF_FONT } from "@/lib/pdf/fonts";

// Letter spacing stays ≤ 0.8pt: wider, and text extraction reads "S U M M A R Y".

export type PdfStyle = Styles[string];

export const inch = (value: number) => value * 72;

export const INK = "#1a1a1a";
export const MUTED = "#4d4d4d";
export const RULE = "#b3b3b3";
export const MAX_LETTER_SPACING = 0.8;

export type ThemeStyles = {
  page: PdfStyle;
  header: PdfStyle;
  name: PdfStyle;
  nameLast: PdfStyle;
  headline: PdfStyle;
  headlineInline: PdfStyle;
  contact: PdfStyle;
  contactNext: PdfStyle;
  link: PdfStyle;
  webLink: PdfStyle;
  headerRule: PdfStyle;
  section: PdfStyle;
  sectionTitle: PdfStyle;
  sectionTitleAccent: PdfStyle;
  sectionTitleRow: PdfStyle;
  sectionTitleRule: PdfStyle;
  paragraph: PdfStyle;
  entry: PdfStyle;
  role: PdfStyle;
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
  entryNote: PdfStyle;
  bullet: PdfStyle;
  bulletGlyph: PdfStyle;
  bulletMark: PdfStyle;
  bulletText: PdfStyle;
  skillLine: PdfStyle;
  skillLabel: PdfStyle;
  skillItems: PdfStyle;
};

export type StyleSlot = keyof ThemeStyles;

export type EntryField = "title" | "org" | "detail" | "dates" | "tech";

export type EntryRow = { lead: readonly EntryField[]; side?: EntryField };

export type EntryKind = "job" | "school" | "item";

export type ContactField = "location" | "email" | "phone" | "links";

export type BulletSpec = {
  glyph: string;
  shape?: "square" | "circle";
};

export type AccentSlot = StyleSlot | readonly [StyleSlot, number];

export type TemplateTheme = {
  styles: ThemeStyles;
  contactLines: readonly (readonly ContactField[])[];
  contactSeparator: string;
  bullet: BulletSpec;
  drawBullet?: boolean;
  // PDF only: react-pdf sets a smaller or larger glyph off the text's middle; browsers centre it.
  bulletOffset?: number;
  rows: Record<EntryKind, readonly EntryRow[]>;
  companyRow?: EntryRow;
  roleRow: EntryRow;
  separators: Partial<Record<EntryField, string>>;
  headingRule: "none" | "below" | "above" | "after";
  headingAccent: number;
  headerRule: boolean;
  nameSplit: boolean;
  headlineInline: boolean;
  dates: "asWritten" | "years";
  skills: "lines" | "bullets";
  accentSlots: readonly AccentSlot[];
};

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

export function defineTheme({ styles = {}, ...options }: ThemeOverrides): TemplateTheme {
  const merged = { ...BASE_STYLES };
  for (const key of Object.keys(styles) as StyleSlot[]) {
    merged[key] = { ...BASE_STYLES[key], ...styles[key] };
  }
  return { ...BASE_THEME, ...options, styles: merged };
}
