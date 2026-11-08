import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Guards the design tokens other components depend on: every name exists, and every pairing we
// actually render meets WCAG AA (4.5:1 for text, 3:1 for icons, borders and focus rings).

const css = readFileSync(fileURLToPath(new URL("../../app/globals.css", import.meta.url)), "utf8");

const colors = new Map<string, string>();
for (const match of css.matchAll(/--color-([a-z-]+):\s*(#[0-9a-f]{6})\s*;/gi)) {
  const [, name, hex] = match;
  if (name && hex) colors.set(name, hex.toLowerCase());
}

function color(name: string): string {
  if (name === "white") return "#ffffff";
  const hex = colors.get(name);
  if (!hex) throw new Error(`Missing color token --color-${name}`);
  return hex;
}

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

const TEXT = 4.5;
const GRAPHIC = 3;

// [foreground, background, minimum ratio]
// Paper, white and stone: the three surfaces text sits on.
const SURFACES = ["background", "surface", "surface-muted"] as const;

const PAIRS: Array<[string, string, number]> = [
  // surface-strong is a hover shade: ink and muted text may sit on it, subtle may not.
  ...[...SURFACES, "surface-strong"].flatMap((bg): Array<[string, string, number]> => [
    ["ink", bg, 7],
    ["muted", bg, TEXT],
  ]),
  ...SURFACES.map((bg): [string, string, number] => ["subtle", bg, TEXT]),
  // Forest buttons and the Pro mark, lavender live pills with the violet dot, highlighter marks,
  // and the ink avatar.
  ["white", "primary", TEXT],
  ["white", "primary-hover", TEXT],
  // Forest and red keys run one shade lighter at the top: white labels must hold there too.
  ["white", "primary-top", TEXT],
  ["white", "primary-hover-top", TEXT],
  ["white", "fail-top", TEXT],
  // White keys on hover, and their labels' icons.
  ["ink", "surface-hover", 7],
  ["muted", "surface-hover", TEXT],
  // The library's filter strip and the phone tabs sit on surface-strong.
  ["muted", "surface-strong", TEXT],
  ["ink", "lavender", TEXT],
  ["accent", "lavender", GRAPHIC],
  ["white", "ink", TEXT],
  ["ink", "highlight", TEXT],
  ["white", "fail", TEXT],
  ["white", "fail-ink", TEXT],
  ["white", "pass", TEXT],
  ...(["pass", "warn", "fail"] as const).flatMap((status): Array<[string, string, number]> => [
    [`${status}-ink`, `${status}-soft`, TEXT],
    ...SURFACES.map((bg): [string, string, number] => [`${status}-ink`, bg, TEXT]),
    ...SURFACES.map((bg): [string, string, number] => [status, bg, GRAPHIC]),
    [status, `${status}-soft`, GRAPHIC],
  ]),
  // Otto's pencil marks and the field outlines must stay visible on every surface they touch.
  ...SURFACES.map((bg): [string, string, number] => ["accent", bg, GRAPHIC]),
  ...SURFACES.map((bg): [string, string, number] => ["border-strong", bg, GRAPHIC]),
  ["muted", "surface-muted", GRAPHIC],
];

describe("design tokens", () => {
  it("defines every color other components rely on, and none of the retired orange fills", () => {
    const required = [
      "background",
      "surface",
      "surface-muted",
      "surface-strong",
      "border",
      "border-strong",
      "ink",
      "muted",
      "subtle",
      "primary",
      "primary-hover",
      "primary-top",
      "primary-hover-top",
      "primary-edge",
      "fail-top",
      "border-control",
      "border-control-hover",
      "surface-hover",
      "accent",
      "lavender",
      "highlight",
      "pass",
      "pass-soft",
      "pass-ink",
      "warn",
      "warn-soft",
      "warn-ink",
      "fail",
      "fail-soft",
      "fail-ink",
      "otter",
      "otter-light",
    ];
    expect(required.filter((name) => !colors.has(name))).toEqual([]);
    // Nothing orange carries text or fills any more, so these must not come back.
    expect(
      ["accent-hover", "accent-soft", "accent-ink"].filter((name) => colors.has(name)),
    ).toEqual([]);
  });

  it.each(PAIRS)("%s on %s meets %d:1", (fg, bg, min) => {
    const ratio = contrast(color(fg), color(bg));
    expect(ratio, `${fg} on ${bg} is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(min);
  });

  it("defines the animation tokens and their keyframes", () => {
    for (const name of [
      "otto-blink",
      "otto-wave",
      "otto-peek",
      "fade-in",
      "fade-out",
      "pop",
      "draw",
      "highlight-in",
      "otto-page",
      "otto-nod",
      "otto-point",
      "otto-chin",
      "otto-tilt",
      "otto-page-lively",
      "otto-point-lively",
      "otto-chin-lively",
      "otto-tilt-lively",
      "scene-scan",
      "scene-keyword-in",
      "scene-keyword-out",
      "scene-float",
    ]) {
      expect(css, `--animate-${name}`).toMatch(new RegExp(`--animate-${name}:\\s*${name}\\s`));
      expect(css, `@keyframes ${name}`).toContain(`@keyframes ${name} {`);
    }
    // Blinking is the only idle loop; the bob is gone and the wave stops after two goes.
    expect(css).not.toContain("otto-bob");
    expect(css).toMatch(/--animate-otto-wave:[^;]*\s2;/);
    // The dashboard's lively Ottos stagger on --otto-delay; the hover takes play once.
    expect(css).toMatch(/--animate-otto-page:[^;]*var\(--otto-delay, 0s\) infinite;/);
    expect(css).toMatch(/--animate-otto-page-lively:[^;]*ease-in-out;/);
  });

  it("defines the shared utilities, shadow and fonts", () => {
    expect(css).toContain("@utility container-page {");
    expect(css).toContain("@utility prose-otto {");
    expect(css).toContain("@utility highlighter {");
    expect(css).toMatch(/--shadow-card:/);
    expect(css).toMatch(/--shadow-float:/);
    expect(css).toMatch(/--font-sans:\s*var\(--font-inter\)/);
    expect(css).toMatch(/--font-display:\s*var\(--font-garamond\)/);
  });
});
