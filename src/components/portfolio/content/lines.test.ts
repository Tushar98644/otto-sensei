import { describe, expect, it } from "vitest";
import { CONTENT_LINES, missingList } from "./lines";

const words = (line: string) => line.trim().split(/\s+/).length;
const item = (label: string, done = false, hidden = false) => ({
  field: "photo" as const,
  label,
  done,
  note: "",
  hidden,
});

describe("Otto's lines above the content cards", () => {
  it("keep to 18 words", () => {
    const longest = CONTENT_LINES.missing(
      missingList([item("Photo"), item("Screenshots"), item("Talks"), item("Writing")]),
    );
    for (const line of [
      CONTENT_LINES.loading,
      CONTENT_LINES.resumeOnly,
      CONTENT_LINES.complete,
      longest,
    ]) {
      expect(words(line)).toBeLessThanOrEqual(18);
    }
  });

  it("names at most three missing things", () => {
    expect(missingList([item("Photo"), item("About", true)])).toBe("photo");
    expect(missingList([item("Photo"), item("Screenshots")])).toBe("photo and screenshots");
    expect(missingList([item("Photo"), item("Screenshots"), item("Talks"), item("Writing")])).toBe(
      "photo, screenshots and a few more",
    );
    expect(missingList([item("Photo", true)])).toBe("");
  });

  it("never asks for something the owner hid on the page", () => {
    expect(missingList([item("Photo", false, true), item("Talks")])).toBe("talks");
  });
});
