import { describe, expect, it } from "vitest";
import { applyLines, bestQuote, plainLines } from "./lines";
import type { CareerLogEntry } from "./types";

function entry(month: string, fields: Partial<CareerLogEntry> = {}): CareerLogEntry {
  return {
    id: `entry-${month}`,
    month,
    shipped: "",
    numbers: "",
    learned: "",
    nothingNew: false,
    createdAt: 0,
    updatedAt: 0,
    ...fields,
  };
}

const ENTRIES = [
  entry("2026-09", {
    shipped: "Rebuilt the signup flow",
    numbers: "signups up 18% in three weeks",
  }),
  entry("2026-10", { shipped: "Helped the data team move reports to the new warehouse" }),
  entry("2026-11", { learned: "Ran the weekly design review" }),
];

const INPUT = {
  role: { title: "Product designer", company: "Northwind" },
  from: "2026-09",
  to: "2026-11",
  existing: [],
};

describe("lines from the log", () => {
  it("keep the person's own numbers and blank out any Otto made up", () => {
    const lines = applyLines(
      {
        lines: [
          { text: "Rebuilt the signup flow, lifting signups 18% in three weeks.", from: [0] },
          { text: "Ran the weekly design review for 12 designers", from: [2] },
        ],
      },
      ENTRIES,
      INPUT,
    );
    expect(lines.map((line) => line.text)).toEqual([
      "Rebuilt the signup flow, lifting signups 18% in three weeks",
      "Ran the weekly design review for [number] designers",
    ]);
    expect(lines[0]).toMatchObject({ months: ["2026-09"], quote: "signups up 18% in three weeks" });
  });

  it("drop a line that claims more ownership than the notes", () => {
    const lines = applyLines(
      { lines: [{ text: "Led the move of reports to the new warehouse", from: [1] }] },
      ENTRIES,
      INPUT,
    );
    expect(lines).toEqual([]);
  });

  it("leave out what the resume already says, and repeats", () => {
    const lines = applyLines(
      {
        lines: [
          { text: "Ran the weekly design review", from: [2] },
          { text: "Rebuilt the signup flow", from: [0] },
          { text: "Rebuilt the signup flow", from: [0] },
        ],
      },
      ENTRIES,
      { ...INPUT, existing: ["Ran the weekly design review."] },
    );
    expect(lines.map((line) => line.text)).toEqual(["Rebuilt the signup flow"]);
  });

  it("fall back to the whole range when Otto cites no note", () => {
    const [line] = applyLines(
      { lines: [{ text: "Ran the weekly design review", from: [9] }] },
      ENTRIES,
      INPUT,
    );
    expect(line?.months).toEqual(["2026-09", "2026-10", "2026-11"]);
  });

  it("without AI, are the person's own words, newest month first", () => {
    expect(plainLines(ENTRIES, []).map((line) => line.text)).toEqual([
      "Ran the weekly design review",
      "Helped the data team move reports to the new warehouse",
      "Rebuilt the signup flow (signups up 18% in three weeks)",
    ]);
  });

  it("quote the sentence that shares the most words", () => {
    expect(bestQuote("Cut signups time with a rebuilt flow", ENTRIES)).toBe(
      "Rebuilt the signup flow",
    );
  });
});
