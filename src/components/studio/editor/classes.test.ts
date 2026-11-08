import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { __unstable__loadDesignSystem } from "tailwindcss";
import { describe, expect, it } from "vitest";

// Tailwind drops unknown classes silently, so a typo would only show up as a styling bug in the
// browser. This compiles every class the editor uses against the app's real globals.css.

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const editorDir = path.join(root, "src/components/studio/editor");
const files = [
  ...readdirSync(editorDir)
    .filter((name) => name.endsWith(".tsx"))
    .map((name) => path.join(editorDir, name)),
  path.join(root, "src/components/studio/steps/fix-step.tsx"),
];

async function loadStylesheet(id: string) {
  if (id !== "tailwindcss") throw new Error(`Unexpected @import "${id}" in globals.css`);
  const file = path.join(root, "node_modules/tailwindcss/index.css");
  return { path: file, base: path.dirname(file), content: readFileSync(file, "utf8") };
}

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
        if (char === quote && source[i - 1] !== "\\") quote = null;
      } else if (char === '"' || char === "'" || char === "`") {
        quote = char;
      } else if (char === "(") {
        depth += 1;
      } else if (char === ")") {
        depth -= 1;
      }
    }
    calls.push(source.slice(start, i - 1));
  }
  return calls;
}

// Marker classes (group, group/line, peer...) that other selectors read; they generate no CSS.
const isMarker = (name: string) => /^(group|peer)(\/[\w-]+)?$/.test(name);

function classesIn(source: string): string[] {
  const literals = [
    ...Array.from(source.matchAll(/className="([^"]*)"/g), (m) => m[1] ?? ""),
    ...Array.from(source.matchAll(/_CLASSES\s*=\s*"([^"]*)"/g), (m) => m[1] ?? ""),
    ...cnArguments(source).flatMap((args) =>
      Array.from(args.matchAll(/"([^"]*)"/g), (m) => m[1] ?? ""),
    ),
  ];
  return literals
    .flatMap((literal) => literal.split(/\s+/))
    .filter((name) => name !== "" && !isMarker(name));
}

describe("editor classes", () => {
  it("finds the classes it checks", () => {
    const sample =
      'cn("a b", open && "c", x ? "d" : "e") className="f g group/line" const X_CLASSES = "h"';
    expect(classesIn(sample).sort()).toEqual(["a", "b", "c", "d", "e", "f", "g", "h"]);
  });

  it("uses only classes Tailwind can generate", async () => {
    const css = readFileSync(path.join(root, "src/app/globals.css"), "utf8");
    const design = await __unstable__loadDesignSystem(css, { base: root, loadStylesheet });
    const classes = [...new Set(files.flatMap((file) => classesIn(readFileSync(file, "utf8"))))];
    const output = design.candidatesToCss(classes);
    const missing = classes.filter((_, index) => !output[index]);
    expect(classes.length).toBeGreaterThan(100);
    expect(missing).toEqual([]);
  });
});
