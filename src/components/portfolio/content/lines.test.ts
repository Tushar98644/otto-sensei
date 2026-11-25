import { describe, expect, it } from "vitest";
import { fmt } from "@/i18n/format";
import { formatFor } from "@/i18n/intl";
import en from "@/i18n/messages/en";
import type { ChecklistItem } from "@/lib/portfolio/content-uses";
import { missingList as missingIn } from "./lines";

const W = en.portfolioContent;
const CONTENT_LINES = {
  ...W.checklist,
  missing: (missing: string) => fmt(W.checklist.missing, { missing }),
};
const missingList = (items: readonly ChecklistItem[]) => missingIn(W, formatFor("en"), items);

const words = (line: string) => line.trim().split(/\s+/).length;
const item = (label: string, done = false, hidden = false) => ({
  field: "pitch" as const,
  label,
  done,
  note: "",
  hidden,
});

describe("Otto's lines above the content cards", () => {
  it("keep to 18 words", () => {
    const longest = CONTENT_LINES.missing(
      missingList([item("Pitch"), item("Talks"), item("Writing"), item("Interests")]),
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
    expect(missingList([item("Pitch"), item("About", true)])).toBe("pitch");
    expect(missingList([item("Pitch"), item("Project write-ups")])).toBe(
      "pitch and project write-ups",
    );
    expect(missingList([item("Pitch"), item("Talks"), item("Writing"), item("Interests")])).toBe(
      "pitch, talks and a few more",
    );
    expect(missingList([item("Pitch", true)])).toBe("");
  });

  it("never asks for something the owner hid on the page", () => {
    expect(missingList([item("Pitch", false, true), item("Talks")])).toBe("talks");
  });

  it("keeps German nouns capitalized inside the sentence", () => {
    expect(missingIn(W, formatFor("de"), [item("Vorträge"), item("Texte")])).toBe(
      "Vorträge and Texte",
    );
  });
});
