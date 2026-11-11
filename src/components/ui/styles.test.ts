import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { __unstable__loadDesignSystem, compile } from "tailwindcss";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const css = readFileSync(path.join(root, "src/app/globals.css"), "utf8");

async function loadStylesheet(id: string) {
  if (id !== "tailwindcss") throw new Error(`Unexpected @import "${id}" in globals.css`);
  const file = path.join(root, "node_modules/tailwindcss/index.css");
  return { path: file, base: path.dirname(file), content: readFileSync(file, "utf8") };
}

const CLASSES = [
  "bg-background",
  "bg-surface",
  "bg-surface-muted",
  "bg-surface-strong",
  "hover:bg-surface-strong",
  "border-border",
  "border-border-strong",
  "text-ink",
  "text-muted",
  "text-subtle",
  "bg-accent",
  "text-accent",
  "bg-ink",
  "hover:bg-ink/85",
  "highlighter",
  "bg-pass",
  "bg-pass-soft",
  "text-pass-ink",
  "bg-warn",
  "bg-warn-soft",
  "text-warn-ink",
  "bg-fail",
  "bg-fail-soft",
  "text-fail-ink",
  "fill-otter",
  "fill-otter-light",
  "shadow-card",
  "shadow-float",
  "font-display",
  "font-sans",
  "ring-ink/15",
  "focus-visible:ring-ink/15",
  "bg-ink/85",
  "animate-otto-blink",
  "motion-safe:animate-otto-blink",
  "animate-otto-wave",
  "motion-safe:animate-otto-peek",
  "animate-fade-in",
  "animate-pop",
  "animate-draw",
  "animate-highlight-in",
  "animate-spin",
  "container-page",
  "prose-otto",
  "field-sizing-content",
  "outline-hidden",
  "ring-3",
  "-outline-offset-2",
  "inset-ring",
  "inset-ring-border",
  "focus-visible:border-ink",
  "focus-visible:shadow-[inset_0_-1px_0_var(--color-ink)]",
  "aria-invalid:border-fail",
  "aria-invalid:focus-visible:ring-fail/15",
  "aria-selected:bg-surface",
  "aria-selected:shadow-card",
  "aria-disabled:pointer-events-none",
  "data-dragging:border-ink",
  "disabled:opacity-100",
  "transform-fill",
  "[&_svg:not([class*='size-'])]:size-4",
  "[&_svg]:shrink-0",
  "max-h-[calc(100dvh-2rem)]",
  "w-[calc(100%-2rem)]",
  "transition-[width]",
  "-translate-y-16",
  "focus:translate-y-0",
  "placeholder:text-subtle",
  "tabular-nums",
  "min-w-5",
  "size-11",
  "size-3.5",
  "sm:-mx-8",
  "tracking-widest",
  "text-5xl/none",
  "lg:text-8xl/none",
  "lining-nums",
  "decoration-border-strong",
  "pointer-coarse:opacity-100",
  "group-focus-within/line:not-sr-only",
  "rounded",
  "bg-primary",
  "hover:bg-primary-hover",
  "bg-lavender",
  "bg-linear-to-b",
  "from-primary-top",
  "hover:from-primary-hover-top",
  "border-primary-edge",
  "shadow-key",
  "inset-shadow-key",
  "active:inset-shadow-pressed",
  "active:translate-y-px",
  "shadow-control",
  "border-border-control",
  "hover:bg-surface-hover",
  "hover:bg-ink/6",
  "disabled:not-aria-busy:bg-none",
  "disabled:not-aria-busy:opacity-45",
  "pointer-coarse:h-11",
  "page-miniature",
  "@container",
  "aspect-17/22",
  "shadow-page",
  "group-hover/card:shadow-page-lift",
  "motion-safe:animate-otto-page",
  "motion-safe:group-hover/otto:animate-otto-page-lively",
  "motion-safe:group-focus-within/otto:animate-otto-chin-lively",
  "motion-safe:animate-scene-scan",
  "motion-safe:animate-fade-out",
  "motion-reduce:hidden",
];

describe("globals.css", () => {
  it("generates CSS for every class the UI kit relies on", async () => {
    const design = await __unstable__loadDesignSystem(css, { base: root, loadStylesheet });
    const output = design.candidatesToCss(CLASSES);
    const missing = CLASSES.filter((_, index) => !output[index]);
    expect(missing).toEqual([]);
  });

  it("compiles the base layer, keyframes and custom utilities", async () => {
    const compiler = await compile(css, { base: root, loadStylesheet });
    const output = compiler.build([
      "animate-otto-blink",
      "animate-pop",
      "container-page",
      "prose-otto",
      "highlighter",
      "bg-accent",
      "bg-primary",
    ]);

    expect(output).toContain("@keyframes otto-blink");
    expect(output).toContain("@keyframes pop");
    expect(output).toContain("--color-accent: #6d4fe8");
    expect(output).toContain("--color-primary: #0e3b2e");
    expect(output).toMatch(/\.highlighter\s*\{[^}]*var\(--color-highlight\)/);
    expect(output).toMatch(/\.container-page\s*\{[^}]*max-width: 72rem/);
    expect(output).toMatch(/@media \(width >= 40rem\)\s*\{\s*padding-inline: 1\.5rem/);
    expect(output).toMatch(/\.prose-otto\s*\{[\s\S]*?& :where\(h2\)\s*\{/);
    expect(output).toContain("html:has(dialog:modal)");
    expect(output).toContain("prefers-reduced-motion: reduce");
    expect(output).toMatch(/body\s*\{[^}]*font-family: var\(--font-sans\)/);
    expect(output).toMatch(/--font-display: var\(--font-garamond\)/);
    expect(output).toMatch(/:focus-visible\s*\{\s*outline: 2px solid var\(--color-ink\)/);
    expect(
      compiler.build(["page-miniature"]),
    ).toMatch(/\.page-miniature\s*\{[^}]*scale: tan\(atan2\(100cqw, 612px\)\)/);
  });
});
