import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { compile } from "tailwindcss";
import { describe, expect, it } from "vitest";
import { Otto, PLAY_TWICE } from "@/components/mascot/otto";
import { createSampleResume } from "@/lib/resume/sample";
import { CheckArt, FormatsArt, TailorArt } from "./action-art";

const root = fileURLToPath(new URL("../../../", import.meta.url));

// The slow loops "Otto at work" adds past the blink; the hover takes end in "-lively".
const SLOW_LOOP = /animate-(otto-(page|nod|point|chin|tilt)|scene-[a-z-]+)(?![\w-])/;

const classLists = (html: string) =>
  [...html.matchAll(/class="([^"]*)"/g)].map((match) => match[1]!.split(" "));

describe("the dashboard home's action art", () => {
  it("plays Otto's and the paper's slow loops twice, then rests with only the blink running", () => {
    const resume = createSampleResume(0);
    const html = renderToStaticMarkup(
      <>
        <CheckArt resume={resume} />
        <TailorArt />
        <FormatsArt resume={resume} />
      </>,
    );
    const lists = classLists(html);
    const looping = lists.filter((list) => list.some((name) => SLOW_LOOP.test(name)));
    expect(looping).toHaveLength(12);
    for (const list of looping) expect(list).toContain(PLAY_TWICE);
    const blinks = lists.filter((list) => list.includes("motion-safe:animate-otto-blink"));
    expect(blinks).toHaveLength(3);
    for (const list of blinks) expect(list).not.toContain(PLAY_TWICE);
    expect(html).toContain("motion-safe:group-hover/otto:animate-otto-page-lively");
    expect(html).toContain("motion-safe:group-hover/otto:animate-otto-point-lively");
    expect(html).toContain("motion-safe:group-hover/otto:animate-otto-chin-lively");
  });

  it("keeps looping wherever else Otto is at work", () => {
    const html = renderToStaticMarkup(<Otto pose="read" lively />);
    expect(html).toContain("motion-safe:animate-otto-page");
    expect(html).not.toContain(PLAY_TWICE);
  });

  it("generates the count after the animation shorthand, so the count wins", async () => {
    const css = readFileSync(path.join(root, "src/app/globals.css"), "utf8");
    const compiler = await compile(css, {
      base: root,
      loadStylesheet: async () => {
        const file = path.join(root, "node_modules/tailwindcss/index.css");
        return { path: file, base: path.dirname(file), content: readFileSync(file, "utf8") };
      },
    });
    const output = compiler.build(["motion-safe:animate-scene-scan", PLAY_TWICE]);
    const shorthand = output.indexOf("animation: var(--animate-scene-scan)");
    const count = output.indexOf("animation-iteration-count: 2;");
    expect(shorthand).toBeGreaterThan(-1);
    expect(count).toBeGreaterThan(shorthand);
    expect(output.slice(shorthand, count)).not.toContain("@media");
  });
});
