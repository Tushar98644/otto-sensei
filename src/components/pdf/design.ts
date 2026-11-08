import {
  ACCENT_COLORS,
  COMPACT_LINE_HEIGHT,
  COMPACT_SPACING,
  FONT_FAMILIES,
  MIN_LINE_HEIGHT,
} from "@/lib/pdf/design";
import type { ResumeDesign } from "@/lib/resume/schema";
import type { PdfStyle, TemplateTheme, ThemeStyles } from "./theme";

// Look settings applied to a format's theme. Each one changes only what it names, so a format
// keeps its character (Developer's code-style Courier, Executive's centered header) under any of
// them, and an empty design returns the theme untouched.

const BODY_FAMILIES = new Set<string>([FONT_FAMILIES.sans.pdf, FONT_FAMILIES.serif.pdf]);
const VERTICAL_SPACE = ["marginTop", "marginBottom", "paddingTop", "paddingBottom"] as const;

// Two decimals: enough for print, and the numbers in a theme stay readable in tests.
const round = (value: number) => Math.round(value * 100) / 100;

function withFont(style: PdfStyle, family: string, isPage: boolean): PdfStyle {
  const current = style.fontFamily;
  // Courier stays: it marks code-style details, not the body text.
  if (isPage || (typeof current === "string" && BODY_FAMILIES.has(current))) {
    return { ...style, fontFamily: family };
  }
  return style;
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

// Headings and every drawn rule take the accent. Rules a format doesn't draw stay undrawn.
function accented(styles: ThemeStyles, color: string): ThemeStyles {
  const ruled = (style: PdfStyle): PdfStyle =>
    typeof style.borderBottomWidth === "number" && style.borderBottomWidth > 0
      ? { ...style, borderBottomColor: color }
      : style;
  return {
    ...styles,
    sectionTitle: ruled({ ...styles.sectionTitle, color }),
    sectionTitleRule: ruled(styles.sectionTitleRule),
    headerRule: ruled(styles.headerRule),
  };
}

export function applyDesign(theme: TemplateTheme, design: ResumeDesign): TemplateTheme {
  const { accent, font, density } = design;
  if (!accent && !font && density !== "compact") return theme;
  let styles = { ...theme.styles };
  const slots = Object.keys(styles) as (keyof ThemeStyles)[];
  if (font) {
    const family = FONT_FAMILIES[font].pdf;
    for (const slot of slots) styles[slot] = withFont(styles[slot], family, slot === "page");
  }
  if (density === "compact") {
    for (const slot of slots) styles[slot] = compacted(styles[slot], slot === "page");
  }
  if (accent) styles = accented(styles, ACCENT_COLORS[accent]);
  return { ...theme, styles };
}
