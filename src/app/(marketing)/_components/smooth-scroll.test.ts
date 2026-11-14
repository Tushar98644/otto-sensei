import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { startSmoothScroll } from "./smooth-scroll";

const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

function browser({ reduce = false, coarse = false }: { reduce?: boolean; coarse?: boolean }) {
  const dataset: Record<string, string | undefined> = {};
  vi.stubGlobal("window", {
    matchMedia: (query: string) => ({
      matches: query.includes("reduce") ? reduce : query.includes("coarse") ? coarse : false,
    }),
  });
  vi.stubGlobal("document", { documentElement: { dataset } });
  return dataset;
}

function fakeLenis() {
  const made: unknown[] = [];
  const destroy = vi.fn();
  class Lenis {
    constructor(options: unknown) {
      made.push(options);
    }
    destroy = destroy;
  }
  const load = vi.fn(async () => ({ default: Lenis }) as unknown as typeof import("lenis"));
  return { load, made, destroy };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("startSmoothScroll", () => {
  it("never loads Lenis on a touch screen and smooths in-page links with CSS instead", () => {
    const dataset = browser({ coarse: true });
    const { load } = fakeLenis();
    const stop = startSmoothScroll(load);
    expect(load).not.toHaveBeenCalled();
    expect(dataset.scrollBehavior).toBe("smooth");
    stop();
    expect(dataset.scrollBehavior).toBeUndefined();
  });

  it("does nothing for people who ask for less motion", () => {
    const dataset = browser({ reduce: true, coarse: true });
    const { load } = fakeLenis();
    startSmoothScroll(load)();
    expect(load).not.toHaveBeenCalled();
    expect(dataset.scrollBehavior).toBeUndefined();
  });

  it("starts Lenis with smooth anchors for a mouse or trackpad, and stops it on the way out", async () => {
    const dataset = browser({});
    const { load, made, destroy } = fakeLenis();
    const stop = startSmoothScroll(load);
    expect(load).toHaveBeenCalledOnce();
    await vi.waitFor(() => expect(made).toHaveLength(1));
    expect(made[0]).toMatchObject({ anchors: true, autoRaf: true });
    expect(dataset.scrollBehavior).toBeUndefined();
    stop();
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("doesn't start Lenis when the page is left before it loads", async () => {
    browser({});
    const { load, made } = fakeLenis();
    startSmoothScroll(load)();
    await Promise.resolve();
    await Promise.resolve();
    expect(made).toHaveLength(0);
  });
});

describe("home page styles", () => {
  it("ships Lenis's rules in the global stylesheet, not a stylesheet of the home page's own", () => {
    const css = read("../../globals.css");
    expect(read("./smooth-scroll.tsx")).not.toContain("lenis.css");
    expect(css).toMatch(/html\.lenis,\s*html\.lenis body\s*\{\s*height: auto;/);
    expect(css).toMatch(/\.lenis\.lenis-smooth iframe\s*\{\s*pointer-events: none;/);
    expect(css).toMatch(
      /@media \(pointer: coarse\) and \(prefers-reduced-motion: no-preference\) \{\s*html\[data-scroll-behavior="smooth"\] \{\s*scroll-behavior: smooth;/,
    );
  });
});
