import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

type FontCall = {
  family: string;
  options: { style?: string | string[]; variable?: string; fallback?: string[] };
};

const calls = vi.hoisted(() => [] as FontCall[]);

vi.mock("next/font/google", () => {
  const font =
    (family: string) =>
    (options: FontCall["options"] = {}) => {
      calls.push({ family, options });
      return {
        className: `face-${[options.style ?? "normal"].flat().join("-")}`,
        variable: options.variable ?? "",
        style: { fontFamily: family },
      };
    };
  return { Inter: font("Inter"), EB_Garamond: font("EB Garamond") };
});

const styles = (call: FontCall | undefined) => [call?.options.style ?? "normal"].flat();
const ems = (html: string) => html.match(/<em [^>]*>/g) ?? [];

describe("Garamond's italic", () => {
  it("is no longer part of the root layout, so the app's other pages never preload it", async () => {
    await import("@/app/layout");
    const root = calls.find((call) => call.options.variable === "--font-garamond");
    expect(root?.family).toBe("EB Garamond");
    expect(styles(root)).toEqual(["normal"]);
  });

  it("is declared once, for the marketing headings, and set on each heading's italic phrase", async () => {
    const [{ Hero }, { PortfolioShowcase }, { PricingTeaser }] = await Promise.all([
      import("./hero"),
      import("./portfolio-showcase"),
      import("./pricing-teaser"),
    ]);
    const italic = calls.filter((call) => styles(call).includes("italic"));
    expect(italic).toHaveLength(1);
    expect(styles(italic[0])).toEqual(["italic"]);
    for (const node of [
      <Hero key="hero" />,
      <PortfolioShowcase key="portfolio" />,
      <PricingTeaser key="pricing" />,
    ]) {
      const found = ems(renderToStaticMarkup(node));
      expect(found).toHaveLength(1);
      expect(found[0]).toBe('<em class="block face-italic">');
    }
  });

  it("falls back to the same serifs as the rest of the heading while it loads", async () => {
    await import("./display-italic");
    const italic = calls.find((call) => styles(call).includes("italic"));
    const css = readFileSync(fileURLToPath(new URL("../../globals.css", import.meta.url)), "utf8");
    const display = css.match(/--font-display: var\(--font-garamond\), ([^;]+);/)?.[1];
    expect(display).toBeDefined();
    expect(italic?.options.fallback).toEqual(display?.split(", "));
  });
});
