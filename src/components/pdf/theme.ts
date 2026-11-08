import type { Styles } from "@react-pdf/renderer";

// A format is a theme for the one shared layout in ./document.tsx, never a layout of its own: one
// column, real text, the person's headings, nothing drawn but lines. That keeps every format
// as readable to hiring software as the others, and the page-break rules written once.
//
// Sizes are in points (72 per inch). Fonts are the standard PDF fonts react-pdf ships (Helvetica,
// Times-Roman, Courier and their bold and italic faces), so nothing loads over the network and
// every glyph maps back to text.

export type PdfStyle = Styles[string];

export const inch = (value: number) => value * 72;

// Grayscale by default: it prints cleanly anywhere and leaves nothing for a parser to trip over.
// The person may pick a dark accent for headings and rules on top (./design.ts).
export const INK = "#1a1a1a";
export const MUTED = "#4d4d4d";
export const RULE = "#b3b3b3";

export type ThemeStyles = {
  page: PdfStyle;
  header: PdfStyle;
  name: PdfStyle;
  headline: PdfStyle;
  contact: PdfStyle;
  contactNext: PdfStyle;
  // Email and plain contact items.
  link: PdfStyle;
  // Web addresses (LinkedIn, GitHub, a portfolio), in the contact lines and on projects.
  webLink: PdfStyle;
  // Drawn under the header when the theme asks for it.
  headerRule: PdfStyle;
  section: PdfStyle;
  sectionTitle: PdfStyle;
  // Only for headingRule "after": the row holding the title and the line that runs to the margin.
  sectionTitleRow: PdfStyle;
  sectionTitleRule: PdfStyle;
  paragraph: PdfStyle;
  entry: PdfStyle;
  entryHeader: PdfStyle;
  entryLead: PdfStyle;
  entryTitle: PdfStyle;
  entryOrg: PdfStyle;
  // Location or project link, after a middle dot.
  entryDetail: PdfStyle;
  // Only for entryLayout "stacked": the company and location line under the title.
  entrySub: PdfStyle;
  dates: PdfStyle;
  // A role under a company header (two or more jobs in a row at one company): the gap above it
  // and its title, which sits under the bold company name.
  role: PdfStyle;
  roleTitle: PdfStyle;
  // A line of description under an entry's heading (items in extra sections).
  entryNote: PdfStyle;
  bullet: PdfStyle;
  bulletGlyph: PdfStyle;
  bulletText: PdfStyle;
  skillLine: PdfStyle;
  skillLabel: PdfStyle;
  skillItems: PdfStyle;
};

export type TemplateTheme = {
  styles: ThemeStyles;
  // Between contact items. Plain characters with a space each side, so parsers keep items apart
  // and react-pdf never breaks a line inside one.
  contactSeparator: string;
  bulletGlyph: string;
  // inline:  "Title, Company · City" with the dates on the right.
  // stacked: the title with the dates on the right, then "Company · City" on the line below.
  entryLayout: "inline" | "stacked";
  // after: a drawn line runs from the heading to the right margin. Rules under a heading are
  // plain borders on sectionTitle.
  headingRule: "none" | "after";
  headerRule: boolean;
};

// The Classic look. Other themes override only what makes them different.
export const BASE_STYLES: ThemeStyles = {
  page: {
    paddingTop: inch(0.6),
    paddingBottom: inch(0.6),
    paddingHorizontal: inch(0.7),
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.35,
    color: INK,
  },
  header: {},
  name: { fontSize: 20, fontWeight: "bold", lineHeight: 1.2 },
  headline: { marginTop: 2, fontSize: 11 },
  contact: { marginTop: 4, fontSize: 9.5, color: MUTED },
  contactNext: { marginTop: 1, fontSize: 9.5, color: MUTED },
  link: { color: MUTED, textDecoration: "none" },
  webLink: { color: MUTED, textDecoration: "none" },
  headerRule: {},
  section: { marginTop: 12 },
  sectionTitle: {
    marginBottom: 6,
    paddingBottom: 2,
    borderBottomWidth: 0.75,
    borderBottomColor: RULE,
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  sectionTitleRow: {},
  sectionTitleRule: {},
  // Spacing sits above each block. The first block of a section follows the heading margin instead.
  paragraph: { marginTop: 3 },
  entry: { marginTop: 7 },
  entryHeader: { flexDirection: "row", justifyContent: "space-between" },
  entryLead: { flex: 1, paddingRight: 12 },
  entryTitle: { fontSize: 10.5, fontWeight: "bold" },
  entryOrg: {},
  entryDetail: { color: MUTED },
  entrySub: {},
  dates: { flexShrink: 0, fontSize: 9.5, color: MUTED, textAlign: "right" },
  role: { marginTop: 4 },
  roleTitle: { fontStyle: "italic" },
  entryNote: { marginTop: 1 },
  bullet: { flexDirection: "row", marginTop: 2 },
  bulletGlyph: { width: 11 },
  bulletText: { flex: 1 },
  skillLine: { marginTop: 2 },
  skillLabel: { fontWeight: "bold" },
  skillItems: {},
};

export const BASE_THEME: TemplateTheme = {
  styles: BASE_STYLES,
  contactSeparator: " | ",
  bulletGlyph: "•",
  entryLayout: "inline",
  headingRule: "none",
  headerRule: false,
};

type ThemeOverrides = Partial<Omit<TemplateTheme, "styles">> & {
  styles?: Partial<ThemeStyles>;
};

// Merged slot by slot, so the layout's structural styles (rows, flex, no-shrink dates) carry over
// and a theme lists only how it looks. Zero a base value to drop it (borderBottomWidth: 0).
export function defineTheme({ styles = {}, ...options }: ThemeOverrides): TemplateTheme {
  const merged = { ...BASE_STYLES };
  for (const key of Object.keys(styles) as (keyof ThemeStyles)[]) {
    merged[key] = { ...BASE_STYLES[key], ...styles[key] };
  }
  return { ...BASE_THEME, ...options, styles: merged };
}
