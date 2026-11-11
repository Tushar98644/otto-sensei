import type { CSSProperties } from "react";
import type { PdfStyle } from "@/components/pdf/theme";
import { cssFontCaps, cssFontFamily } from "@/lib/pdf/fonts";

// Theme lengths are PDF points; here each is var(--pt) pixels, set per screen width, so a format
// keeps its proportions and stays readable on a phone.

const LENGTHS = new Set([
  "fontSize",
  "height",
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
    // The PDF's fonts, as installed look-alikes (the same stacks the thumbnails use).
    if (key === "fontFamily") {
      css.fontFamily = cssFontFamily(value);
      return;
    }
    if (key === "fontFeatureSettings") {
      const caps = cssFontCaps(value);
      if (caps) css.fontVariantCaps = caps;
      return;
    }
    if (key === "borderBottomWidth" || key === "borderTopWidth") {
      if (typeof value !== "number" || value <= 0) {
        css[key] = 0;
        return;
      }
      // A 0.5pt hairline would round away on some screens.
      css[key] = `max(1px, ${points(value)})`;
      css[key === "borderTopWidth" ? "borderTopStyle" : "borderBottomStyle"] = "solid";
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
