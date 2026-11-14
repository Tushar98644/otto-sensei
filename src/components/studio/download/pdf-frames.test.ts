import { describe, expect, it } from "vitest";
import { addFrame, dropHiddenFrames, showFrame, type FrameView } from "./pdf-frames";

const start: FrameView = { frames: ["a"], shown: "a" };

describe("preview frames", () => {
  it("shows a loaded frame, then drops the one it replaced", () => {
    const loading = addFrame(start, "b");
    expect(loading).toEqual({ frames: ["a", "b"], shown: "a" });
    const shown = showFrame(loading, "b");
    expect(shown).toEqual({ frames: ["a", "b"], shown: "b" });
    expect(dropHiddenFrames(shown, "b")).toEqual({ frames: ["b"], shown: "b" });
  });

  it("keeps the page on screen when a newer file replaces a frame that just loaded", () => {
    const replaced = addFrame(addFrame(start, "b"), "c");
    expect(replaced).toEqual({ frames: ["a", "c"], shown: "a" });
    expect(showFrame(replaced, "b")).toBe(replaced);
    expect(dropHiddenFrames(replaced, "b")).toBe(replaced);
  });

  it("keeps the newest frame when the shown one fades out late", () => {
    const shown = showFrame(addFrame(start, "b"), "b");
    const newer = addFrame(shown, "c");
    expect(newer).toEqual({ frames: ["b", "c"], shown: "b" });
    expect(dropHiddenFrames(newer, "b")).toBe(newer);
    expect(showFrame(newer, "b")).toBe(newer);
  });

  it("shows the first frame once it loads", () => {
    const first: FrameView = { frames: ["a"], shown: null };
    const shown = showFrame(first, "a");
    expect(shown).toEqual({ frames: ["a"], shown: "a" });
    expect(dropHiddenFrames(shown, "a")).toBe(shown);
  });
});
