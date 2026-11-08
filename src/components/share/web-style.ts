import type { CSSProperties } from "react";
import type { PdfStyle } from "@/components/pdf/theme";

// A format's react-pdf styles as CSS for the public web page. Lengths in a theme are PDF points;
// here each point is var(--pt) pixels, which the page sets per screen width, so a format keeps its
// proportions on any screen and stays readable on a phone. The miniature on the dashboard
// (resume-thumbnail.tsx) draws one point as one pixel instead.

// The PDF's standard fonts, as the same --font-page-* stacks the thumbnails use.
const FONTS: Record<string, string> = {
  Helvetica: "var(--font-page-sans)",
  "Times-Roman": "var(--font-page-serif)",
  Courier: "var(--font-page-mono)",
};

const LENGTHS = new Set([
  "fontSize",
  "letterSpacing",
  "marginTop",
  "marginBottom",
  "marginLeft",
  "marginRight",
  "paddingTop",
  "paddingBottom",
  "paddingLeft",
  "paddingRight",
  "width",
]);

// react-pdf's own shorthands, spelled out.
const SHORTHANDS: Record<string, readonly [string, string]> = {
  paddingHorizontal: ["paddingLeft", "paddingRight"],
  paddingVertical: ["paddingTop", "paddingBottom"],
  marginHorizontal: ["marginLeft", "marginRight"],
  marginVertical: ["marginTop", "marginBottom"],
};

export function points(value: number): string {
  return `calc(${value} * var(--pt))`;
}

/** CSS for one theme slot. `omit` drops properties the page sets its own way (e.g. margins). */
export function webStyle(style: PdfStyle | undefined, omit: readonly string[] = []): CSSProperties {
  if (!style) return {};
  const css: Record<string, string | number> = {};
  const skip = new Set(omit);

  function put(key: string, value: unknown) {
    if (skip.has(key) || value === undefined || value === null) return;
    if (key === "fontFamily") {
      if (typeof value === "string") css.fontFamily = FONTS[value] ?? FONTS.Helvetica!;
      return;
    }
    if (key === "borderBottomWidth") {
      if (typeof value !== "number" || value <= 0) {
        css.borderBottomWidth = 0;
        return;
      }
      // A 0.5pt hairline would round away on some screens.
      css.borderBottomWidth = `max(1px, ${points(value)})`;
      css.borderBottomStyle = "solid";
      return;
    }
    if (LENGTHS.has(key) && typeof value === "number") {
      css[key] = points(value);
      return;
    }
    if (typeof value === "string" || typeof value === "number") css[key] = value;
  }

  for (const [key, value] of Object.entries(style)) {
    const longhands = SHORTHANDS[key];
    if (longhands) {
      if (skip.has(key)) continue;
      for (const longhand of longhands) put(longhand, value);
    } else {
      put(key, value);
    }
  }
  return css as CSSProperties;
}
