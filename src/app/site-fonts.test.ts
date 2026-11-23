import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const APP = path.join(process.cwd(), "src/app");
const SCREENS = new Set(["page.tsx", "not-found.tsx", "error.tsx", "loading.tsx", "template.tsx"]);

// Public portfolios draw in their design's own fonts.
const OWN_FONTS = new Set(["p/[slug]/page.tsx"]);

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

  it("are left out of the root layout, which /p shares", () => {
    expect(readFileSync(path.join(APP, "layout.tsx"), "utf8")).not.toMatch(/next\/font|SiteFonts/);
  });
});
