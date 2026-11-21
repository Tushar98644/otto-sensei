import { describe, expect, it } from "vitest";
import { chosenFormatLines } from "./chosen-format-note";

describe("chosenFormatLines", () => {
  it("promises the chosen look when the download will have it", () => {
    expect(chosenFormatLines("compact", false).title).toBe(
      "Your resume will come out in Compact.",
    );
    expect(chosenFormatLines("modern", true)).toEqual({
      title: "Your resume will come out in Modern.",
      detail: "You can change it on the download step.",
    });
  });

  it("tells Free a Pro format downloads in Classic instead of asking for Pro", () => {
    expect(chosenFormatLines("modern", false)).toEqual({
      title: "Your resume will be set to Modern.",
      detail: "Modern is a Pro format, so on Free your download comes out in Classic.",
    });
  });

  it("promises nothing about a Pro format while the plan is loading", () => {
    const lines = chosenFormatLines("executive", null);
    expect(lines.title).toBe("Your resume will be set to Executive.");
    expect(lines.detail).not.toMatch(/Pro|Classic/);
  });
});
