import { describe, expect, it } from "vitest";
import { lineEnding, punctuationIssues, setFullStop } from "./punctuation";

const lines = (...texts: string[]) => texts.map((text, index) => ({ id: `l${index}`, text }));
const flagged = (...texts: string[]) => {
  const issues = punctuationIssues(lines(...texts));
  return [...issues].map(([id, issue]) => [id, issue.message]);
};

describe("lineEnding", () => {
  it.each([
    ["Cut costs 20%.", "stop"],
    ["Cut costs 20%. ", "stop"],
    ['Won the "Best Intern" award.', "stop"],
    ['Named "Best Intern."', "stop"],
    ["Shipped it with Node.js.", "stop"],
    ["Cut costs 20%", "none"],
    ["Built tools (React, Go)", "none"],
    ["Led hiring;", "none"],
  ] as const)("%j -> %s", (text, ending) => {
    expect(lineEnding(text)).toBe(ending);
  });

  it.each([
    "Can we cut costs?",
    "Cut costs!",
    "Cut costs...",
    "Cut costs…",
    "Built tools for Acme (now part of Initech Inc.)",
    "Built tools for Acme (see below.)",
    "Wrote docs, tests, etc.",
    "Sold to Acme Inc.",
    "Moved the team to the U.S.",
    "Supported 3 offices, e.g.",
    "",
    "  ",
    "-",
  ])("can't tell from %j", (text) => {
    expect(lineEnding(text)).toBeNull();
  });
});

describe("punctuationIssues", () => {
  it("flags the lines that end unlike most of the others", () => {
    expect(flagged("Cut costs 20%", "Led 3 hires.", "Built a CLI", "Wrote the docs")).toEqual([
      ["l1", "Most lines here end without a full stop. Remove this one to match."],
    ]);
    expect(flagged("Cut costs 20%.", "Led 3 hires", "Built a CLI.")).toEqual([
      ["l1", "Most lines here end with a full stop. Add one here to match."],
    ]);
  });

  it("follows the first line on a tie", () => {
    expect(flagged("Cut costs 20%.", "Led 3 hires")).toEqual([
      ["l1", "Your first line here ends with a full stop. Add one here to match."],
    ]);
    expect(flagged("Cut costs 20%", "Led 3 hires.")).toEqual([
      ["l1", "Your first line here ends without a full stop. Remove this one to match."],
    ]);
  });

  it("returns nothing when the lines agree or there is nothing to compare", () => {
    expect(flagged("Cut costs 20%.", "Led 3 hires.")).toEqual([]);
    expect(flagged("Cut costs 20%", "Led 3 hires")).toEqual([]);
    expect(flagged("Cut costs 20%.")).toEqual([]);
    expect(flagged()).toEqual([]);
    expect(flagged("Cut costs 20%.", "Can we hire faster?", "Wrote docs, tests, etc.")).toEqual([]);
  });

  it("leaves unreadable endings out of the count and unflagged", () => {
    expect(
      flagged("Cut costs 20%", "Led 3 hires", "Sold to Acme Inc.", "Won!", "Built a CLI."),
    ).toEqual([["l4", "Most lines here end without a full stop. Remove this one to match."]]);
  });

  it("gives each flagged line a low tip with nothing to highlight", () => {
    const [issue] = punctuationIssues(lines("Cut costs.", "Led hires", "Built a CLI")).values();
    expect(issue).toEqual({
      id: "punctuation",
      severity: "low",
      message: "Most lines here end without a full stop. Remove this one to match.",
      match: null,
    });
  });
});

describe("setFullStop", () => {
  it.each([
    ["Cut costs 20%", true, "Cut costs 20%."],
    ["Cut costs 20%  ", true, "Cut costs 20%."],
    ["Cut costs 20%.", true, "Cut costs 20%."],
    ["Cut costs 20%.", false, "Cut costs 20%"],
    ["Cut costs 20%", false, "Cut costs 20%"],
    ['Named "Best Intern."', false, 'Named "Best Intern"'],
    ['Named "Best Intern"', true, 'Named "Best Intern."'],
  ] as const)("%j, stop %s -> %j", (text, stop, expected) => {
    expect(setFullStop(text, stop)).toBe(expected);
  });
});
