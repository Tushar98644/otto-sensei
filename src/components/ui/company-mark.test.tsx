import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  COMPANY_TINTS,
  CompanyMark,
  companyInitial,
  companyKey,
  companyTint,
} from "./company-mark";

function channel(hex: string, offset: number): number {
  const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  return 0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5);
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

describe("CompanyMark", () => {
  it("gives a company the same tint every time, whatever its spelling", () => {
    expect(companyTint("Stripe")).toBe(companyTint("Stripe"));
    expect(companyTint("stripe")).toBe(companyTint("Stripe"));
    expect(companyTint("  Stripe, Inc. ")).toBe(companyTint("Stripe"));
    expect(companyKey("Acme Corp.")).toBe("acme");
  });

  it("spreads different companies across the palette", () => {
    const names = [
      "Stripe",
      "Notion",
      "Linear",
      "Figma",
      "Canva",
      "Vercel",
      "Airbnb",
      "Shopify",
      "Google",
      "Ramp",
    ];
    expect(new Set(names.map((name) => companyTint(name).name)).size).toBeGreaterThanOrEqual(5);
  });

  it("keeps every tint's letter readable and every tint soft", () => {
    for (const tint of COMPANY_TINTS) {
      expect(contrast(tint.ink, tint.bg), tint.name).toBeGreaterThanOrEqual(4.5);
      expect(contrast(tint.bg, "#ffffff"), tint.name).toBeLessThan(1.4);
    }
  });

  it("uses the first letter of the name, skipping a leading The", () => {
    expect(companyInitial("Stripe")).toBe("S");
    expect(companyInitial("the Browser Company")).toBe("B");
    expect(companyInitial("37signals")).toBe("3");
    expect(companyInitial("éclair")).toBe("É");
    expect(companyInitial("  ")).toBe("");
  });

  it("is hidden from screen readers, since the name is always written beside it", () => {
    const html = renderToStaticMarkup(<CompanyMark name="Stripe" size="lg" />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain(">S</span>");
    expect(html).toContain(`background-color:${companyTint("Stripe").bg}`);
  });

  it("falls back to a quiet building when there is no name", () => {
    const html = renderToStaticMarkup(<CompanyMark name="" size="sm" />);
    expect(html).toContain("bg-surface-muted");
    expect(html).toContain("<svg");
  });
});
