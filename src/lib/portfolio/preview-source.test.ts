import { describe, expect, it } from "vitest";
import { jordanContentView } from "./fixtures/jordan";
import { isThinPage, parsePreviewSource, previewSourceFor } from "./preview-source";

// Each project as [line, description]; one job unless said otherwise.
const page = (projects: [string, string][], about: string[], jobs = 1) => ({
  projects: projects.map(([line, description]) => ({ line, description })),
  experience: Array.from({ length: jobs }, (_, i) => ({ id: `e${i}` })),
  about,
});

describe("a thin page", () => {
  it("has fewer than two projects with words about them, no job, or no about", () => {
    expect(isThinPage(page([], ["Hi"]))).toBe(true);
    expect(
      isThinPage(
        page(
          [
            ["A line.", ""],
            ["", ""],
            [" ", "  "],
          ],
          ["Hi"],
        ),
      ),
    ).toBe(true);
    expect(
      isThinPage(
        page(
          [
            ["A line.", ""],
            ["", "A paragraph."],
          ],
          [],
        ),
      ),
    ).toBe(true);
    expect(
      isThinPage(
        page(
          [
            ["A line.", ""],
            ["", "A paragraph."],
          ],
          ["   "],
        ),
      ),
    ).toBe(true);
    expect(
      isThinPage(
        page(
          [
            ["A line.", ""],
            ["", "A paragraph."],
          ],
          ["Hi"],
          0,
        ),
      ),
    ).toBe(true);
    expect(
      isThinPage(
        page(
          [
            ["A line.", ""],
            ["", ""],
            ["", "A paragraph."],
          ],
          ["Hi"],
        ),
      ),
    ).toBe(false);
  });

  it("isn't the sample, which fills everything", () => {
    expect(isThinPage(jordanContentView())).toBe(false);
  });
});

describe("whose page the previews draw", () => {
  it("starts on the sample for a thin page and on theirs for a full one", () => {
    expect(previewSourceFor({ hasOwn: true, thin: true, stored: null })).toBe("sample");
    expect(previewSourceFor({ hasOwn: true, thin: false, stored: null })).toBe("own");
  });

  it("keeps what this browser picked, either way", () => {
    expect(previewSourceFor({ hasOwn: true, thin: true, stored: "own" })).toBe("own");
    expect(previewSourceFor({ hasOwn: true, thin: false, stored: "sample" })).toBe("sample");
  });

  it("is always the sample without a page of their own", () => {
    expect(previewSourceFor({ hasOwn: false, thin: false, stored: "own" })).toBe("sample");
  });

  it("reads only the two choices back from storage", () => {
    expect(parsePreviewSource("own")).toBe("own");
    expect(parsePreviewSource("sample")).toBe("sample");
    expect(parsePreviewSource("mine")).toBeNull();
    expect(parsePreviewSource(null)).toBeNull();
  });
});
