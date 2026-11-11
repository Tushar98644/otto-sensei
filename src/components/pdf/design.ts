import { fontCovers } from "@/lib/pdf/coverage";
import {
  ACCENT_COLORS,
  COMPACT_LINE_HEIGHT,
  COMPACT_SPACING,
  FONT_FAMILIES,
  MIN_LINE_HEIGHT,
} from "@/lib/pdf/design";
import { primaryFont } from "@/lib/pdf/fonts";
import type { ResumeDesign } from "@/lib/resume/schema";
import type { PdfStyle, StyleSlot, TemplateTheme, ThemeStyles } from "./theme";

const VERTICAL_SPACE = ["marginTop", "marginBottom", "paddingTop", "paddingBottom"] as const;

const round = (value: number) => Math.round(value * 100) / 100;

function withFont(style: PdfStyle, family: string, isPage: boolean): PdfStyle {
  return isPage || style.fontFamily !== undefined ? { ...style, fontFamily: family } : style;
}

function compacted(style: PdfStyle, isPage: boolean): PdfStyle {
  const next: PdfStyle = { ...style };
  for (const key of VERTICAL_SPACE) {
    const value = next[key];
    if (typeof value === "number") next[key] = round(value * COMPACT_SPACING);
  }
  if (isPage && typeof next.paddingHorizontal === "number") {
    next.paddingHorizontal = round(next.paddingHorizontal * COMPACT_SPACING);
  }
  if (typeof next.lineHeight === "number") {
    next.lineHeight = Math.max(MIN_LINE_HEIGHT, round(next.lineHeight * COMPACT_LINE_HEIGHT));
  }
  return next;
}

export function tint(color: string, amount: number): string {
  const channels = [1, 3, 5].map((at) => parseInt(color.slice(at, at + 2), 16));
  return `#${channels
    .map((channel) =>
      Math.round(channel + (255 - channel) * amount)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

const positive = (value: unknown) => typeof value === "number" && value > 0;

function recolored(style: PdfStyle, color: string): PdfStyle {
  const next: PdfStyle = { ...style, color };
  if (positive(style.borderBottomWidth)) next.borderBottomColor = color;
  if (positive(style.borderTopWidth)) next.borderTopColor = color;
  if (positive(style.borderWidth)) next.borderColor = color;
  if (style.backgroundColor !== undefined) next.backgroundColor = color;
  return next;
}

function accented(theme: TemplateTheme, color: string): ThemeStyles {
  const styles = { ...theme.styles };
  for (const entry of theme.accentSlots) {
    const [slot, amount] = typeof entry === "string" ? [entry, 0] : entry;
    styles[slot as StyleSlot] = recolored(
      styles[slot as StyleSlot],
      amount ? tint(color, amount) : color,
    );
  }
  return styles;
}

function fontOf(styles: ThemeStyles, ...slots: StyleSlot[]) {
  for (const slot of slots) {
    const name = primaryFont(styles[slot].fontFamily);
    if (name) return name;
  }
  return primaryFont(styles.page.fontFamily);
}

// A glyph the theme's font lacks prints from a fallback or not at all, so marks are drawn.
function withMarks(theme: TemplateTheme): TemplateTheme {
  const { styles } = theme;
  const bulletFont = fontOf(styles, "bulletGlyph");
  const contactFont = fontOf(styles, "contact");
  const drawBullet = bulletFont !== null && !fontCovers(bulletFont, theme.bullet.glyph);
  const separator =
    contactFont !== null && !fontCovers(contactFont, theme.contactSeparator.trim())
      ? " | "
      : theme.contactSeparator;
  if (drawBullet === Boolean(theme.drawBullet) && separator === theme.contactSeparator) {
    return theme;
  }
  return { ...theme, drawBullet, contactSeparator: separator };
}

export function applyDesign(theme: TemplateTheme, design: ResumeDesign): TemplateTheme {
  const { accent, font, density } = design;
  if (!accent && !font && density !== "compact") return withMarks(theme);
  let styles = { ...theme.styles };
  const slots = Object.keys(styles) as StyleSlot[];
  if (font) {
    const family = FONT_FAMILIES[font].pdf;
    for (const slot of slots) styles[slot] = withFont(styles[slot], family, slot === "page");
  }
  if (density === "compact") {
    for (const slot of slots) styles[slot] = compacted(styles[slot], slot === "page");
  }
  if (accent) styles = accented({ ...theme, styles }, ACCENT_COLORS[accent]);
  return withMarks({ ...theme, styles });
}
