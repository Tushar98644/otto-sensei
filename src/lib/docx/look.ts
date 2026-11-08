import type { PdfStyle, TemplateTheme } from "@/components/pdf/theme";
import { FONT_FAMILIES } from "@/lib/pdf/design";
import type { PdfPageSize } from "@/lib/pdf/page-size";

// The Word file's sizes, fonts and colors, read from the same theme the PDF uses (format plus the
// person's look settings), so both downloads look like one resume.

const WORD_FONTS: Readonly<Record<string, string>> = {
  [FONT_FAMILIES.sans.pdf]: FONT_FAMILIES.sans.word,
  [FONT_FAMILIES.serif.pdf]: FONT_FAMILIES.serif.word,
  Courier: "Courier New",
};

// Page sizes in points.
export const PAGE_POINTS: Record<PdfPageSize, { width: number; height: number }> = {
  LETTER: { width: 612, height: 792 },
  A4: { width: 595.3, height: 841.9 },
};

const num = (value: PdfStyle[keyof PdfStyle], fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;
const color = (value: unknown, fallback: string) =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
const isBold = (style: PdfStyle, fallback: boolean) =>
  style.fontWeight === undefined
    ? fallback
    : style.fontWeight === "bold" || style.fontWeight === 700;
const font = (style: PdfStyle, fallback: string) =>
  typeof style.fontFamily === "string" ? (WORD_FONTS[style.fontFamily] ?? fallback) : fallback;

export type TextLook = {
  font: string;
  size: number;
  bold: boolean;
  italic: boolean;
  caps: boolean;
  color: string;
  letterSpacing: number;
};

export type DocxLook = {
  page: { width: number; height: number; top: number; bottom: number; left: number; right: number };
  // Width between the margins: where the right-aligned dates sit.
  textWidth: number;
  body: TextLook;
  lineHeight: number;
  centerHeader: boolean;
  name: TextLook;
  headline: TextLook;
  contact: TextLook & { before: number };
  contactSeparator: string;
  headerRule: { color: string; width: number } | null;
  heading: TextLook & {
    before: number;
    after: number;
    rule: { color: string; width: number } | null;
  };
  entryLayout: TemplateTheme["entryLayout"];
  entryBefore: number;
  roleBefore: number;
  entryTitle: TextLook;
  roleTitle: TextLook;
  org: TextLook;
  detail: TextLook;
  dates: TextLook;
  bulletBefore: number;
  bulletIndent: number;
  bulletGlyph: string;
  paragraphBefore: number;
  skillBefore: number;
  skillLabelBold: boolean;
};

export function docxLook(theme: TemplateTheme, pageSize: PdfPageSize): DocxLook {
  const s = theme.styles;
  const page = PAGE_POINTS[pageSize];
  const baseFont = font(s.page, FONT_FAMILIES.sans.word);
  const ink = color(s.page.color, "#1a1a1a");
  const bodySize = num(s.page.fontSize, 10);
  const text = (style: PdfStyle, parent: TextLook): TextLook => ({
    font: font(style, parent.font),
    size: num(style.fontSize, parent.size),
    bold: isBold(style, parent.bold),
    italic: style.fontStyle === undefined ? parent.italic : style.fontStyle === "italic",
    caps: style.textTransform === undefined ? parent.caps : style.textTransform === "uppercase",
    color: color(style.color, parent.color),
    letterSpacing: num(style.letterSpacing, 0),
  });
  const body: TextLook = {
    font: baseFont,
    size: bodySize,
    bold: false,
    italic: false,
    caps: false,
    color: ink,
    letterSpacing: 0,
  };
  const horizontal = num(s.page.paddingHorizontal, 50);
  const margins = {
    top: num(s.page.paddingTop, 43),
    bottom: num(s.page.paddingBottom, 43),
    left: horizontal,
    right: horizontal,
  };
  const ruleOf = (style: PdfStyle) => {
    const width = num(style.borderBottomWidth, 0);
    return width > 0 ? { color: color(style.borderBottomColor, ink), width } : null;
  };
  const contact = text(s.contact, body);
  const heading = text(s.sectionTitle, body);
  const entryTitle = text(s.entryTitle, body);
  return {
    page: { ...page, ...margins },
    textWidth: page.width - margins.left - margins.right,
    body,
    lineHeight: num(s.page.lineHeight, 1.35),
    centerHeader: s.header.alignItems === "center",
    name: text(s.name, { ...body, bold: true }),
    headline: text(s.headline, body),
    contact: { ...contact, before: num(s.contact.marginTop, 4) },
    contactSeparator: theme.contactSeparator,
    headerRule: theme.headerRule ? ruleOf(s.headerRule) : null,
    heading: {
      ...heading,
      before: num(s.section.marginTop, 12),
      // With a rule running after the heading (Modern), the row's margin is the gap below.
      after: num(
        theme.headingRule === "after"
          ? s.sectionTitleRow.marginBottom
          : s.sectionTitle.marginBottom,
        6,
      ),
      rule: theme.headingRule === "after" ? ruleOf(s.sectionTitleRule) : ruleOf(s.sectionTitle),
    },
    entryLayout: theme.entryLayout,
    entryBefore: num(s.entry.marginTop, 7),
    roleBefore: num(s.role.marginTop, 4),
    entryTitle,
    roleTitle: text(s.roleTitle, body),
    org: text(s.entryOrg, body),
    detail: text(s.entryDetail, body),
    dates: text(s.dates, body),
    bulletBefore: num(s.bullet.marginTop, 2),
    bulletIndent: num(s.bulletGlyph.width, 11),
    bulletGlyph: theme.bulletGlyph,
    paragraphBefore: num(s.paragraph.marginTop, 3),
    skillBefore: num(s.skillLine.marginTop, 2),
    skillLabelBold: isBold(s.skillLabel, true),
  };
}
