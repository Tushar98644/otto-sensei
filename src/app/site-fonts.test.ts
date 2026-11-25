import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NotFoundFonts } from "@/components/site/not-found-fonts";

const SRC = path.join(process.cwd(), "src");
const APP = path.join(SRC, "app");
const SCREENS = new Set(["page.tsx", "not-found.tsx", "error.tsx", "loading.tsx", "template.tsx"]);

// Public portfolios draw in their design's own fonts.
const OWN_FONTS = new Set(["p/[slug]/page.tsx"]);
const ROOT_LAYOUTS = ["[lang]/layout.tsx", "p/[slug]/layout.tsx"];

function screens(dir: string): string[] {
  return readdirSync(path.join(APP, dir), { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "api" ? [] : screens(relative);
    return SCREENS.has(entry.name) ? [relative] : [];
  });
}

function draws(file: string, component: string): boolean {
  return readFileSync(path.join(APP, file), "utf8").includes(`<${component} />`);
}

// The nearest layout below the root that brings the app's fonts, or the screen itself.
function fontSource(file: string): string | null {
  if (draws(file, "SiteFonts") || draws(file, "NotFoundFonts")) return file;
  for (let dir = path.dirname(file); dir !== "."; dir = path.dirname(dir)) {
    const layout = path.join(dir, "layout.tsx");
    try {
      if (draws(layout, "SiteFonts")) return layout;
    } catch {
      continue;
    }
  }
  return null;
}

describe("the app's fonts", () => {
  it("reach every screen through a layout below the root, so /p preloads none of them", () => {
    const missing = screens(".")
      .filter((file) => !OWN_FONTS.has(file))
      .filter((file) => fontSource(file) === null);
    expect(missing).toEqual([]);
  });

  it("are left out of the root layouts and the document they share with /p", () => {
    for (const file of [
      ...ROOT_LAYOUTS.map((layout) => path.join(APP, layout)),
      path.join(SRC, "components/site/root-document.tsx"),
    ]) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(/next\/font|SiteFonts/);
    }
  });
});

const SPECIFIER = /(?:\bfrom\s+|\bimport\s*\(\s*|\bimport\s+)["']([^"']+)["']/g;
const FONT_IMPORT = /import\s+(?:\{([^}]*)\}|(\w+))\s+from\s+["']next\/font\/(?:google|local)["']/g;

function resolveImport(from: string, specifier: string): string | null {
  let base: string | null = null;
  if (specifier.startsWith("@/")) base = path.join(SRC, specifier.slice(2));
  else if (specifier.startsWith(".")) base = path.resolve(path.dirname(from), specifier);
  if (base === null) return null;
  const candidates = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"].map((end) => base + end);
  const isSource = (file: string) =>
    /\.tsx?$/.test(file) && existsSync(file) && statSync(file).isFile();
  return candidates.find(isSource) ?? null;
}

// Every source module the given app files import, eagerly or lazily.
function modulesOf(entries: string[]): Map<string, string> {
  const seen = new Map<string, string>();
  const queue = entries.map((file) => path.join(APP, file));
  for (let file = queue.pop(); file !== undefined; file = queue.pop()) {
    if (seen.has(file)) continue;
    const source = readFileSync(file, "utf8");
    seen.set(file, source);
    for (const [, specifier = ""] of source.matchAll(SPECIFIER)) {
      const target = resolveImport(file, specifier);
      if (target !== null && !seen.has(target)) queue.push(target);
    }
  }
  return seen;
}

const localName = (part: string) =>
  part
    .trim()
    .split(/\s+as\s+/)
    .pop() ?? "";

// Font loader calls in a module, and how many of them opt out of the preload.
function fontLoads(source: string): { calls: number; unpreloaded: number } {
  const loaders = [...source.matchAll(FONT_IMPORT)].flatMap(([, named = "", single]) =>
    single ? [single] : named.split(",").map(localName).filter(Boolean),
  );
  const calls = loaders.reduce(
    (total, name) => total + source.split(new RegExp(`\\b${name}\\(`)).length - 1,
    0,
  );
  return { calls, unpreloaded: source.split("preload: false").length - 1 };
}

const fromSrc = (file: string) => path.relative(SRC, file);

// /p carries its own root layout and the global error, then its page and its not-found.
const PORTFOLIO_ROOT = ["p/[slug]/layout.tsx", "global-error.tsx"];
const PORTFOLIO = ["p/[slug]/page.tsx", "p/[slug]/not-found.tsx"];

describe("/p's HTML", () => {
  it("preloads no app fonts: nothing it is built from loads the app's fonts or preloads a font", () => {
    const modules = modulesOf([...PORTFOLIO_ROOT, ...PORTFOLIO]);
    expect(modules.has(path.join(SRC, "components/site/site-fonts.tsx"))).toBe(false);
    const preloading = [...modules]
      .filter(([, source]) => {
        const { calls, unpreloaded } = fontLoads(source);
        return calls > unpreloaded;
      })
      .map(([file]) => fromSrc(file));
    expect(preloading).toEqual([]);
  });

  it("gets no font stylesheet from the not-found pages, which draw in faces the root CSS declares", () => {
    const modules = modulesOf([
      ...PORTFOLIO_ROOT,
      ...ROOT_LAYOUTS,
      "global-not-found.tsx",
      "[lang]/not-found.tsx",
      "p/[slug]/not-found.tsx",
    ]);
    const loaders = [...modules].filter(([, source]) => fontLoads(source).calls > 0);
    expect(loaders.map(([file]) => fromSrc(file))).toEqual([]);
    const css = readFileSync(path.join(APP, "globals.css"), "utf8");
    const declared = new Set(
      [...css.matchAll(/@font-face\s*\{[^}]*font-family:\s*"([^"]+)"/g)].map(
        ([, family]) => family,
      ),
    );
    const markup = renderToStaticMarkup(createElement(NotFoundFonts));
    const named = [...markup.matchAll(/--font-(?:inter|garamond):([^;}]+)/g)].flatMap(
      ([, stack = ""]) => [...stack.matchAll(/["']([^"']+)["']/g)].map(([, family = ""]) => family),
    );
    expect(named).toHaveLength(4);
    for (const family of named) expect(declared).toContain(family);
  });
});
