import { describe, expect, it } from "vitest";
import { pageWindows, samePages } from "./paginate";

const at = (top: number, margin = 0) => ({ cut: top - margin, next: top });

describe("pageWindows", () => {
  it("keeps a short flow on one page", () => {
    expect(pageWindows([at(100), at(300)], 500, 720)).toEqual([{ start: 0, end: 500 }]);
  });

  it("moves the first block that doesn't fit to the next page whole", () => {
    expect(pageWindows([at(200), at(600, 10), at(700, 10)], 1000, 720)).toEqual([
      { start: 0, end: 690 },
      { start: 700, end: 1000 },
    ]);
  });

  it("keeps a block that ends exactly at the page bottom", () => {
    expect(pageWindows([at(720)], 900, 720)).toEqual([
      { start: 0, end: 720 },
      { start: 720, end: 900 },
    ]);
  });

  it("cuts a block taller than a page", () => {
    expect(pageWindows([], 1600, 720)).toEqual([
      { start: 0, end: 720 },
      { start: 720, end: 1440 },
      { start: 1440, end: 1600 },
    ]);
  });

  it("starts each page at the last break that still fits", () => {
    expect(pageWindows([at(400), at(700), at(1000), at(1500), at(1800)], 2000, 720)).toEqual([
      { start: 0, end: 700 },
      { start: 700, end: 1000 },
      { start: 1000, end: 1500 },
      { start: 1500, end: 2000 },
    ]);
  });

  it("moves a block taller than a page to a fresh page, then cuts it", () => {
    expect(pageWindows([at(100), at(1000)], 1200, 720)).toEqual([
      { start: 0, end: 100 },
      { start: 100, end: 820 },
      { start: 820, end: 1200 },
    ]);
  });
});

describe("samePages", () => {
  it("compares page by page", () => {
    expect(samePages([{ start: 0, end: 10 }], [{ start: 0, end: 10 }])).toBe(true);
    expect(samePages([{ start: 0, end: 10 }], [{ start: 0, end: 11 }])).toBe(false);
    expect(samePages([{ start: 0, end: 10 }], [])).toBe(false);
  });
});
