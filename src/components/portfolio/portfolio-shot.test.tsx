import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PORTFOLIO_PICKS } from "@/lib/portfolio/templates";
import { PortfolioShot, PreloadShot } from "./portfolio-shot";
import { SHOT_BLUR, SHOT_HEIGHTS, SHOT_WIDTH, SHOT_WIDTHS } from "./portfolio-shot-data";
import { whenLoadedAndIdle, type PreloadWhenIdleProps } from "./portfolio-shot-preload";

const SIZES = "(min-width: 1024px) 40rem, 90vw";

const imgOf = (html: string) => html.match(/<img[^>]*>/)?.[0] ?? "";
const attr = (tag: string, name: string) =>
  tag.match(new RegExp(`\\s${name}="([^"]*)"`, "i"))?.[1]?.replaceAll("&amp;", "&");

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("PortfolioShot", () => {
  it("is a plain lazy <img> from the server, with no client code of its own", () => {
    const source = readFileSync(
      fileURLToPath(new URL("./portfolio-shot.tsx", import.meta.url)),
      "utf8",
    );
    expect(source).not.toContain('"use client"');
    const html = renderToStaticMarkup(<PortfolioShot id="reel" sizes={SIZES} />);
    expect(html.match(/<img/g)).toHaveLength(1);
    const img = imgOf(html);
    expect(attr(img, "loading")).toBe("lazy");
    expect(attr(img, "decoding")).toBe("async");
    expect(attr(img, "alt")).toBe("A portfolio page in the Reel design");
    expect(attr(img, "sizes")).toBe(SIZES);
    expect(attr(img, "width")).toBe("1600");
    expect(attr(img, "height")).toBe("2500");
    expect(attr(img, "class")).toBe("scroll-pan h-auto w-full");
    const files = new Set(
      attr(img, "srcset")
        ?.split(", ")
        .map((entry) => entry.split(" ")[0]),
    );
    expect(files.size).toBeGreaterThan(1);
    for (const file of files)
      expect(file).toMatch(/^\/portfolio-shots\/reel-(480|800|1200|1600)\.webp$/);
    const style = attr(img, "style") ?? "";
    expect(style).toContain("--pan:-60.00%");
    expect(style).toContain("background-image:url(&quot;data:image/svg+xml");
  });

  it("is preloaded with exactly the srcset and sizes the <img> uses, so one file serves both", () => {
    const img = imgOf(renderToStaticMarkup(<PortfolioShot id="reel" sizes={SIZES} />));
    const preload = PreloadShot({ id: "reel", sizes: SIZES }).props as PreloadWhenIdleProps;
    expect(preload.imageSrcSet).toBe(attr(img, "srcset"));
    expect(preload.imageSizes).toBe(attr(img, "sizes"));
    expect(preload.href).toBe(attr(img, "src"));
  });
});

describe("the portfolio pictures on disk", () => {
  const dir = fileURLToPath(new URL("../../../public/portfolio-shots/", import.meta.url));

  it("are exactly Our picks, each at every width, so a design that leaves the picks takes its pictures with it", () => {
    const expected = PORTFOLIO_PICKS.flatMap((id) => SHOT_WIDTHS.map((w) => `${id}-${w}.webp`));
    expect(readdirSync(dir).sort()).toEqual(expected.sort());
  });

  it("have the listed heights, and a small blur placeholder each", async () => {
    for (const id of PORTFOLIO_PICKS) {
      for (const width of SHOT_WIDTHS) {
        const meta = await sharp(`${dir}${id}-${width}.webp`).metadata();
        expect(meta.width).toBe(width);
        expect(meta.height).toBe(Math.round((SHOT_HEIGHTS[id] * width) / SHOT_WIDTH));
      }
      const blur = SHOT_BLUR[id].replace("data:image/webp;base64,", "");
      expect((await sharp(Buffer.from(blur, "base64")).metadata()).width).toBe(20);
    }
  });
});

describe("whenLoadedAndIdle", () => {
  function page(readyState: DocumentReadyState, idle: boolean) {
    const loads: Array<() => void> = [];
    const idleTasks: Array<() => void> = [];
    const win = {
      addEventListener: vi.fn((_: string, listener: () => void) => loads.push(listener)),
      removeEventListener: vi.fn(),
      setTimeout: (task: () => void, ms: number) => setTimeout(task, ms),
      clearTimeout: (handle: ReturnType<typeof setTimeout>) => clearTimeout(handle),
      ...(idle
        ? {
            requestIdleCallback: vi.fn((task: () => void) => idleTasks.push(task)),
            cancelIdleCallback: vi.fn(),
          }
        : {}),
    };
    vi.stubGlobal("window", win);
    vi.stubGlobal("document", { readyState });
    return { win, loads, idleTasks };
  }

  it("waits for the page to finish loading, then for an idle moment", () => {
    const { loads, idleTasks } = page("interactive", true);
    const task = vi.fn();
    whenLoadedAndIdle(task);
    expect(idleTasks).toHaveLength(0);
    loads[0]!();
    expect(task).not.toHaveBeenCalled();
    idleTasks[0]!();
    expect(task).toHaveBeenCalledOnce();
  });

  it("cancels cleanly whether it is still waiting for load or for idle", () => {
    const waiting = page("loading", true);
    whenLoadedAndIdle(vi.fn())();
    expect(waiting.win.removeEventListener).toHaveBeenCalledWith("load", waiting.loads[0]);
    const loaded = page("complete", true);
    whenLoadedAndIdle(vi.fn())();
    expect(loaded.idleTasks).toHaveLength(1);
    expect(loaded.win.cancelIdleCallback).toHaveBeenCalledOnce();
  });

  it("falls back to a short timer where the browser has no idle callback", () => {
    vi.useFakeTimers();
    page("complete", false);
    const task = vi.fn();
    whenLoadedAndIdle(task);
    expect(task).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(task).toHaveBeenCalledOnce();
  });
});
