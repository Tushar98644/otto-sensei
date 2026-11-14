import { describe, expect, it } from "vitest";
import { keepSize, reelMode } from "./root";

const inside = (match: string | null) =>
  ({ closest: (selector: string) => (selector === match ? {} : null) }) as unknown as Element;

describe("reelMode", () => {
  it("draws picture cards still, whatever the motion setting", () => {
    expect(reelMode(inside("[data-pf-still]"), false)).toBe("still");
    expect(reelMode(inside("[data-pf-still]"), true)).toBe("still");
  });

  it("shows the pre-rendered stills, never three.js, in the editor's preview and for reduced motion", () => {
    expect(reelMode(inside("[inert]"), false)).toBe("lite");
    expect(reelMode(inside(null), true)).toBe("lite");
  });

  it("runs the sphere and the device models on the public page", () => {
    expect(reelMode(inside(null), false)).toBe("live");
  });
});

describe("keepSize", () => {
  it("keeps the same object when nothing changed, so the reel doesn't re-render", () => {
    const size = { width: 1280, height: 800 };
    expect(keepSize(size, { width: 1280, height: 800 })).toBe(size);
  });

  it("takes the new size when either side changed", () => {
    const size = { width: 1280, height: 800 };
    expect(keepSize(size, { width: 1280, height: 720 })).toEqual({ width: 1280, height: 720 });
    expect(keepSize(size, { width: 390, height: 800 })).toEqual({ width: 390, height: 800 });
  });
});
