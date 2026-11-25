// Golden English HTML (docs/i18n.md): `save <folder>` after building main, `compare <folder>` after building a change.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const BUILT = path.join(process.cwd(), ".next/server/app");
const OTHER_LOCALES = ["es", "pt-br", "fr", "de"];

// The address a prerendered file serves: en/pricing.html and the older pricing.html are both /pricing.
export function pagePath(file: string): string | null {
  const route = file
    .replace(/\.html$/, "")
    .replace(/^en(\/|$)/, "/")
    .replace(/^index$/, "/");
  const page = route.startsWith("/") ? route : `/${route}`;
  if (OTHER_LOCALES.some((segment) => page === `/${segment}` || page.startsWith(`/${segment}/`))) {
    return null;
  }
  return page.length > 1 ? page.replace(/\/$/, "") : page;
}

// What a visitor and a crawler get: scripts, build hashes and React's tree-position ids taken out.
export function normalize(html: string): string {
  return (
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "")
      // React's empty separators between text pieces: copy moved into messages joins them.
      .replace(/<!-- -->/g, "")
      .replace(/<link rel="preload" as="script"[^>]*>/g, "")
      .replace(/\/_next\/static\/[^"'\s)]+/g, "/_next/static/…")
      .replace(/_R_[0-9a-zA-Z]+_/g, "_R_id_")
      .replace(/>\s*</g, ">\n<")
  );
}

function htmlFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" }).filter((file) =>
    file.endsWith(".html"),
  );
}

export function pagesIn(dir: string): Record<string, string> {
  const pages: Record<string, string> = {};
  for (const file of htmlFiles(dir)) {
    const page = pagePath(file);
    if (page) pages[page] = normalize(readFileSync(path.join(dir, file), "utf8"));
  }
  return pages;
}

export function differences(
  before: Record<string, string>,
  after: Record<string, string>,
): string[] {
  const out: string[] = [];
  for (const page of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const old = before[page];
    const now = after[page];
    if (old === undefined) out.push(`${page}: new`);
    else if (now === undefined) out.push(`${page}: gone`);
    else if (old !== now) {
      const oldLines = old.split("\n");
      const nowLines = now.split("\n");
      const at = oldLines.findIndex((line, i) => line !== nowLines[i]);
      out.push(
        `${page}: - ${oldLines[at]?.slice(0, 160)}\n${" ".repeat(page.length + 2)}+ ${nowLines[at]?.slice(0, 160)}`,
      );
    }
  }
  return out.sort();
}

if (import.meta.main) {
  const [command, folder] = process.argv.slice(2);
  if (!folder || (command !== "save" && command !== "compare")) {
    console.error("Usage: bun scripts/golden-html.ts save|compare <folder>");
    process.exit(2);
  }
  const file = path.join(folder, "golden-html.json");
  if (command === "save") {
    mkdirSync(folder, { recursive: true });
    const pages = pagesIn(BUILT);
    writeFileSync(file, JSON.stringify(pages));
    console.log(`Saved ${Object.keys(pages).length} pages to ${file}.`);
  } else {
    const found = differences(JSON.parse(readFileSync(file, "utf8")), pagesIn(BUILT));
    console.log(found.length ? found.join("\n") : "Every page is the same.");
    process.exit(found.length ? 1 : 0);
  }
}
