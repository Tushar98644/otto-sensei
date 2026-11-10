import { describe, expect, it } from "vitest";
import { previewFit } from "./preview-frame";

describe("previewFit", () => {
  it("lays the desktop page out at laptop width and zooms it down into a smaller box", () => {
    expect(previewFit("desktop", 640)).toEqual({ page: 1280, zoom: 0.5 });
  });

  it("uses a wide box's own width at full size instead of zooming in", () => {
    expect(previewFit("desktop", 1500)).toEqual({ page: 1500, zoom: 1 });
  });

  it("keeps the phone at phone width, shrinking it only when the box is narrower", () => {
    expect(previewFit("phone", 800)).toEqual({ page: 390, zoom: 1 });
    expect(previewFit("phone", 312)).toEqual({ page: 390, zoom: 0.8 });
  });

  it("draws nothing before the box has been measured", () => {
    expect(previewFit("desktop", 0).zoom).toBe(0);
    expect(previewFit("phone", Number.NaN).zoom).toBe(0);
  });
});
