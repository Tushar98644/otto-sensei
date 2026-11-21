import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { __unstable__loadDesignSystem } from "tailwindcss";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const css = readFileSync(path.join(root, "src/app/globals.css"), "utf8");

const SOURCES = [
  "src/components/site",
  "src/app/(marketing)/layout.tsx",
  "src/app/(marketing)/page.tsx",
  "src/app/(marketing)/_components",
  "src/app/(marketing)/pricing",
  "src/app/(marketing)/privacy",
  "src/app/(marketing)/terms",
  "src/app/(marketing)/refunds",
  "src/app/not-found.tsx",
];

const MARKERS = new Set(["group", "peer"]);

function tsxFiles(entry: string): string[] {
  const full = path.join(root, entry);
  if (statSync(full).isFile()) return [full];
  return readdirSync(full, { recursive: true, encoding: "utf8" })
    .filter((name) => name.endsWith(".tsx") && !name.endsWith(".test.tsx"))
    .map((name) => path.join(full, name));
}

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

function classLiterals(code: string): string[] {
  return Array.from(code.matchAll(/(===|!==)?\s*"([^"\\]*)"/g))
    .filter(([, comparison]) => !comparison)
    .map(([, , value]) => value ?? "");
}

function classesIn(source: string): string[] {
  const lists = [
    ...Array.from(source.matchAll(/className="([^"]*)"/g), (match) => match[1] ?? ""),
    ...Array.from(source.matchAll(/className:\s*"([^"]*)"/g), (match) => match[1] ?? ""),
    ...cnArguments(source).flatMap(classLiterals),
    ...Array.from(source.matchAll(/const \w*CLASSES\b[^=]*=\s*\{([\s\S]*?)\};/g), (match) =>
      classLiterals(match[1] ?? ""),
    ).flat(),
  ];
  return lists.flatMap((list) => list.split(/\s+/)).filter(Boolean);
}

async function loadStylesheet(id: string) {
  if (id !== "tailwindcss") throw new Error(`Unexpected @import "${id}" in globals.css`);
  const file = path.join(root, "node_modules/tailwindcss/index.css");
  return { path: file, base: path.dirname(file), content: readFileSync(file, "utf8") };
}

const files = SOURCES.flatMap(tsxFiles);

describe("marketing classes", () => {
  it("finds the files and their classes", () => {
    expect(files.length).toBeGreaterThan(15);
    const all = files.flatMap((file) => classesIn(readFileSync(file, "utf8")));
    expect(all).toContain("container-page");
    expect(all).toContain("@max-xs:sr-only");
  });

  it("keeps class lists static, so this check and Prettier can read them", () => {
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source, path.relative(root, file)).not.toMatch(/className=\{`/);
    }
  });

  it("only uses classes that Tailwind turns into CSS", async () => {
    const design = await __unstable__loadDesignSystem(css, { base: root, loadStylesheet });
    const byFile = files.map((file) => ({
      file: path.relative(root, file),
      classes: [...new Set(classesIn(readFileSync(file, "utf8")))].filter((c) => !MARKERS.has(c)),
    }));
    const unknown = byFile.flatMap(({ file, classes }) => {
      const output = design.candidatesToCss(classes);
      return classes.filter((_, index) => !output[index]).map((name) => `${file}: ${name}`);
    });
    expect(unknown).toEqual([]);
  });
});
