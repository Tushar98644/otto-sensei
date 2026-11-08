import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { __unstable__loadDesignSystem } from "tailwindcss";
import { describe, expect, it } from "vitest";

// Tailwind drops classes it doesn't know without a word, so a typo in a button variant or a card
// would only show up as a styling bug. This compiles every class the dashboard and the UI kit use
// against the real globals.css.

const root = fileURLToPath(new URL("../../../", import.meta.url));

function tsx(dir: string): string[] {
  const full = path.join(root, dir);
  return readdirSync(full)
    .filter((name) => name.endsWith(".tsx"))
    .map((name) => path.join(full, name));
}

const files = [
  ...tsx("src/components/dashboard"),
  ...tsx("src/components/dashboard/applications"),
  ...tsx("src/components/ui"),
];

// Tables whose values aren't class lists.
const NOT_CLASSES = new Set(["FONTS", "THEMES", "STATUS_LABELS"]);

// The text of every cn(...) call, matching parentheses and skipping over string contents.
function cnArguments(source: string): string[] {
  const calls: string[] = [];
  for (const match of source.matchAll(/\bcn\(/g)) {
    const start = match.index + match[0].length;
    let depth = 1;
    let quote: string | null = null;
    let i = start;
    for (; i < source.length && depth > 0; i++) {
      const char = source[i];
      if (quote) {
        if (char === "\\") i++;
        else if (char === quote) quote = null;
      } else if (char === '"' || char === "'" || char === "`") quote = char;
      else if (char === "(") depth++;
      else if (char === ")") depth--;
    }
    calls.push(source.slice(start, i - 1));
  }
  return calls;
}

// String literals that are class lists. Literals compared with === or !== are values, and quoted
// object keys ("icon-sm": ...) are names, not classes.
function literals(code: string): string[] {
  return Array.from(code.matchAll(/"([^"\\]*)"/g))
    .filter((match) => {
      const before = code.slice(Math.max(0, match.index - 4), match.index);
      const after = code.charAt(match.index + match[0].length);
      return !/[=!]==\s*$/.test(before) && after !== ":";
    })
    .map((match) => match[1] ?? "");
}

const isMarker = (name: string) => /^(group|peer)(\/[\w-]+)?$/.test(name);

export function classesIn(source: string): string[] {
  const lists = [
    // className, bodyClassName, triggerClassName, ...
    ...Array.from(source.matchAll(/\w*[cC]lassName="([^"]*)"/g), (m) => m[1] ?? ""),
    ...Array.from(source.matchAll(/\w*[cC]lassName:\s*"([^"]*)"/g), (m) => m[1] ?? ""),
    ...cnArguments(source).flatMap(literals),
    // Upper-case constants and lookup tables: BASE = "...", VARIANTS: Record<...> = { ... }.
    ...Array.from(source.matchAll(/const ([A-Z][A-Z0-9_]*)\b[^=\n]*=\s*"([^"]*)"/g))
      .filter(([, name]) => !NOT_CLASSES.has(name ?? ""))
      .map((m) => m[2] ?? ""),
    ...Array.from(source.matchAll(/const ([A-Z][A-Z0-9_]*)\b[^=\n]*=\s*\{([\s\S]*?)\n\};/g))
      .filter(([, name]) => !NOT_CLASSES.has(name ?? ""))
      .flatMap((m) => literals(m[2] ?? "")),
    ...Array.from(source.matchAll(/const \w*[cC]lasses\s*=\s*"([^"]*)"/g), (m) => m[1] ?? ""),
  ];
  return lists.flatMap((list) => list.split(/\s+/)).filter((name) => name !== "" && !isMarker(name));
}

async function loadStylesheet(id: string) {
  if (id !== "tailwindcss") throw new Error(`Unexpected @import "${id}" in globals.css`);
  const file = path.join(root, "node_modules/tailwindcss/index.css");
  return { path: file, base: path.dirname(file), content: readFileSync(file, "utf8") };
}

describe("dashboard and UI kit classes", () => {
  it("finds the classes it checks", () => {
    const sample = `cn("a b", open && "c") className="d group/card" bodyClassName="e"
const BASE = "f";
const VARIANTS: Record<X, string> = {
  one: "g h",
};`;
    expect(classesIn(sample).sort()).toEqual(["a", "b", "c", "d", "e", "f", "g", "h"]);
  });

  it("uses only classes Tailwind can generate", async () => {
    const css = readFileSync(path.join(root, "src/app/globals.css"), "utf8");
    const design = await __unstable__loadDesignSystem(css, { base: root, loadStylesheet });
    const byFile = files.map((file) => ({
      file: path.relative(root, file),
      classes: [...new Set(classesIn(readFileSync(file, "utf8")))],
    }));
    const missing = byFile.flatMap(({ file, classes }) => {
      const output = design.candidatesToCss(classes);
      return classes.filter((_, index) => !output[index]).map((name) => `${file}: ${name}`);
    });
    expect(byFile.flatMap(({ classes }) => classes).length).toBeGreaterThan(300);
    expect(missing).toEqual([]);
  });
});
