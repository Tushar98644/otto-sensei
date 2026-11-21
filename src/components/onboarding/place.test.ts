import { describe, expect, it } from "vitest";
import { fitsBand, placeTip, visibleBand } from "./place";

const VIEW_H = 844;
const VIEW_W = 390;
const tip = { width: 352, height: 180 };

function bar(top: number, bottom: number, left = 0, width = VIEW_W) {
  return { top, bottom, left, width, height: bottom - top };
}

const topBar = bar(0, 56);
const sectionTabs = bar(56, 124);
const stepBar = bar(768, 832, 16, 358);
const line = { left: 24, width: 200 };

function box(top: number, height: number) {
  return { top, bottom: top + height, left: 24, width: 200, height };
}

describe("visibleBand", () => {
  it("is the whole screen with no bars", () => {
    expect(visibleBand([], line, VIEW_H)).toEqual({ top: 0, bottom: VIEW_H });
  });

  it("stacks the bars stuck to the top and keeps above the step bar", () => {
    expect(visibleBand([stepBar, sectionTabs, topBar], line, VIEW_H)).toEqual({
      top: 124,
      bottom: 768,
    });
  });

  it("leaves out a sticky bar that hasn't reached the top yet", () => {
    const tabsInFlow = bar(300, 368);
    expect(visibleBand([topBar, tabsInFlow], line, VIEW_H)).toEqual({ top: 56, bottom: VIEW_H });
  });

  it("leaves out a sticky side column and a bar beside the target", () => {
    const outline = bar(80, 828, 24, 224);
    const editorLine = { left: 280, width: 640 };
    const sideBar = bar(0, 64, 0, 240);
    expect(visibleBand([bar(0, 64, 0, 1200), outline], editorLine, VIEW_H)).toEqual({
      top: 64,
      bottom: VIEW_H,
    });
    expect(visibleBand([sideBar], editorLine, VIEW_H)).toEqual({ top: 0, bottom: VIEW_H });
  });
});

describe("fitsBand", () => {
  const band = { top: 124, bottom: 768 };

  it("needs the whole target between the bars", () => {
    expect(fitsBand(box(200, 44), band)).toBe(true);
    expect(fitsBand(box(100, 44), band)).toBe(false);
    expect(fitsBand(box(740, 44), band)).toBe(false);
  });
});

describe("placeTip", () => {
  const band = { top: 124, bottom: 768 };
  const place = (target: ReturnType<typeof box>) =>
    placeTip({ target, tip, band, viewWidth: 1200, ringPadding: 4 });

  it("goes below the target when it fits", () => {
    expect(place(box(200, 44))).toMatchObject({ top: 256, left: 24 });
  });

  it("goes above the target when the step bar leaves no room below", () => {
    expect(place(box(600, 44))?.top).toBe(600 - 12 - tip.height);
  });

  it("never rises over the top bar after scrolling", () => {
    const placed = place(box(110, 44));
    expect(placed?.top).toBeGreaterThanOrEqual(band.top + 16);
    expect(placed?.ring.top).toBe(band.top);
  });

  it("hides while the target is scrolled under a bar or off the screen", () => {
    expect(place(box(60, 44))).toBeNull();
    expect(place(box(-200, 44))).toBeNull();
    expect(place(box(760, 44))).toBeNull();
    expect(place(box(900, 44))).toBeNull();
    expect(place({ top: 0, bottom: 0, left: 0, width: 0, height: 0 })).toBeNull();
  });

  it("keeps a tall card's tip on screen while part of the card shows", () => {
    const placed = place(box(-100, 1200));
    expect(placed).not.toBeNull();
    expect(placed!.top).toBeGreaterThanOrEqual(band.top + 16);
    expect(placed!.top + tip.height).toBeLessThanOrEqual(band.bottom - 16);
    expect(placed!.ring).toMatchObject({ top: band.top, height: band.bottom - band.top });
  });

  it("stays inside a narrow screen", () => {
    const placed = placeTip({
      target: { ...box(200, 44), left: 300 },
      tip,
      band,
      viewWidth: VIEW_W,
      ringPadding: 4,
    });
    expect(placed?.left).toBe(VIEW_W - 16 - tip.width);
  });
});
