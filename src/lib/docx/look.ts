import type { PdfStyle, TemplateTheme } from "@/components/pdf/theme";
import { PDF_FONT, PDF_FONT_FAMILIES, primaryFont, type PdfFontName } from "@/lib/pdf/fonts";
import type { PdfPageSize } from "@/lib/pdf/page-size";

export const PAGE_POINTS: Record<PdfPageSize, { width: number; height: number }> = {
  LETTER: { width: 612, height: 792 },
  A4: { width: 595.3, height: 841.9 },
};

// Word picks faces by name, not weight: a light face is a family of its own.
const LIGHT_FACES: Partial<Record<PdfFontName, string>> = {
  Roboto: "Roboto Light",
  "Source Sans 3": "Source Sans 3 Light",
};

const num = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;
const color = (value: unknown, fallback: string) =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;

export type TextLook = {
  family: PdfFontName;
  font: string;
  size: number;
  bold: boolean;
  light: boolean;
  italic: boolean;
  caps: boolean;
  smallCaps: boolean;
  color: string;
  letterSpacing: number;
};

export function textLook(style: PdfStyle | undefined, parent: TextLook): TextLook {
  if (!style) return parent;
  const family = primaryFont(style.fontFamily) ?? parent.family;
  const weight = style.fontWeight;
  const bold =
    weight === undefined
      ? parent.bold
      : weight === "bold" || (typeof weight === "number" && weight >= 600);
  const light =
    weight === undefined
      ? parent.light && family === parent.family
      : typeof weight === "number" && weight < 400;
  const features = style.fontFeatureSettings;
  return {
    family,
    font: wordFont(family, light && !bold),
    size: num(style.fontSize, parent.size),
    bold,
    light,
    italic: style.fontStyle === undefined ? parent.italic : style.fontStyle === "italic",
    caps: style.textTransform === undefined ? parent.caps : style.textTransform === "uppercase",
    smallCaps:
      features === undefined
        ? parent.smallCaps
        : Array.isArray(features) && features.includes("smcp"),
    color: color(style.color, parent.color),
    letterSpacing: num(style.letterSpacing, parent.letterSpacing),
  };
}

export function wordFont(family: PdfFontName, light = false): string {
  return (light && LIGHT_FACES[family]) || PDF_FONT_FAMILIES[family].word;
}

export type RuleLook = { color: string; width: number };

export type DocxLook = {
  theme: TemplateTheme;
  page: { width: number; height: number; top: number; bottom: number; left: number; right: number };
  textWidth: number;
  body: TextLook;
  lineHeight: number;
  centerHeader: boolean;
  name: TextLook;
  headline: TextLook;
  contact: TextLook & { before: number };
  contactNext: TextLook;
  headerRule: RuleLook | null;
  heading: TextLook & {
    before: number;
    after: number;
    center: boolean;
    rule: (RuleLook & { place: "below" | "above" | "after" }) | null;
  };
  entryBefore: number;
  roleBefore: number;
  bulletBefore: number;
  bulletLeft: number;
  bulletHanging: number;
  bulletGlyph: string;
  bulletLook: TextLook;
  paragraphBefore: number;
  skillBefore: number;
  indent: { left: number; right: number };
  fonts: Set<PdfFontName>;
};

function ruleOf(style: PdfStyle, side: "Top" | "Bottom", ink: string): RuleLook | null {
  const width = num(style[`border${side}Width`], 0);
  return width > 0 ? { color: color(style[`border${side}Color`], ink), width } : null;
}

export const WORD_BULLET_FONT = "Arial";

export function docxLook(theme: TemplateTheme, pageSize: PdfPageSize): DocxLook {
  const s = theme.styles;
  const page = PAGE_POINTS[pageSize];
  const ink = color(s.page.color, "#1a1a1a");
  const family = primaryFont(s.page.fontFamily) ?? PDF_FONT.carlito;
  const pageLight = typeof s.page.fontWeight === "number" && s.page.fontWeight < 400;
  const body: TextLook = {
    family,
    font: wordFont(family, pageLight),
    size: num(s.page.fontSize, 11),
    bold: false,
    light: pageLight,
    italic: false,
    caps: false,
    smallCaps: false,
    color: ink,
    letterSpacing: 0,
  };
  const horizontal = num(s.page.paddingHorizontal, 54);
  const margins = {
    top: num(s.page.paddingTop, 36),
    bottom: num(s.page.paddingBottom, 36),
    left: horizontal,
    right: horizontal,
  };
  const heading = textLook(s.sectionTitle, body);
  const rule =
    theme.headingRule === "none"
      ? null
      : theme.headingRule === "above"
        ? ruleOf(s.sectionTitleRule, "Top", ink)
        : ruleOf(s.sectionTitleRule, "Bottom", ink);
  const contact = textLook(s.contact, body);
  const glyphBox = s.bulletGlyph;
  const bulletHanging = num(glyphBox.width, 18);
  const bulletLook = textLook(glyphBox, body);
  const fonts = new Set<PdfFontName>();
  for (const style of Object.values(s)) {
    const name = primaryFont((style as PdfStyle).fontFamily);
    if (name) fonts.add(name);
  }
  return {
    theme,
    page: { ...page, ...margins },
    textWidth: page.width - margins.left - margins.right,
    body,
    lineHeight: num(s.page.lineHeight, 1.2),
    centerHeader: s.name.textAlign === "center" || s.header.alignItems === "center",
    name: textLook(s.name, { ...body, bold: true }),
    headline: textLook(s.headline, body),
    contact: { ...contact, before: num(s.contact.marginTop, 0) },
    contactNext: textLook(s.contactNext, body),
    headerRule: theme.headerRule ? ruleOf(s.headerRule, "Bottom", ink) : null,
    heading: {
      ...heading,
      before: num(s.section.marginTop, 12),
      after: num(
        theme.headingRule === "after"
          ? s.sectionTitleRow.marginBottom
          : s.sectionTitle.marginBottom,
        2,
      ),
      center: s.sectionTitle.textAlign === "center",
      rule: rule && theme.headingRule !== "none" ? { ...rule, place: theme.headingRule } : null,
    },
    entryBefore: num(s.entry.marginTop, 8),
    roleBefore: num(s.role.marginTop, 4),
    bulletBefore: num(s.bullet.marginTop, 1),
    bulletLeft: num(s.bullet.paddingLeft, 0) + bulletHanging,
    bulletHanging,
    bulletGlyph: theme.bullet.glyph,
    bulletLook,
    paragraphBefore: num(s.paragraph.marginTop, 3),
    skillBefore: num(s.skillLine.marginTop, 1),
    indent: { left: num(s.row1.paddingLeft, 0), right: num(s.row1.paddingRight, 0) },
    fonts,
  };
}
