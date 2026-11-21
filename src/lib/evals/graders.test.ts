import { describe, expect, it } from "vitest";
import { z } from "zod";
import { CLICHES } from "@/lib/ai/writing-guards";
import {
  AI_TELLS,
  matchesSchema,
  noBannedPhrases,
  noInventedNumbers,
  novelWordsAtMost,
  withinLength,
} from "./graders";

describe("matchesSchema", () => {
  const schema = z.object({ suggestion: z.string().min(1), issues: z.array(z.string()) });

  it("passes a value of the right shape", () => {
    expect(matchesSchema(schema, { suggestion: "Cut costs", issues: [] })).toEqual({
      name: "schema",
      pass: true,
      detail: "matches the schema",
    });
  });

  it("names the failing paths", () => {
    const grade = matchesSchema(schema, { suggestion: "", issues: "none" }, "result-shape");
    expect(grade.name).toBe("result-shape");
    expect(grade.pass).toBe(false);
    expect(grade.detail).toContain("suggestion:");
    expect(grade.detail).toContain("issues:");
  });
});

describe("withinLength", () => {
  it("checks characters by default", () => {
    expect(withinLength("short", { max: 10 }).pass).toBe(true);
    const grade = withinLength(["fine", "this one is far too long"], { max: 10 });
    expect(grade.pass).toBe(false);
    expect(grade.detail).toContain("over 10");
    expect(grade.detail).toContain("this one is far too long");
  });

  it("checks words, both ends", () => {
    expect(withinLength("one two three", { min: 2, max: 3, unit: "words" }).pass).toBe(true);
    const short = withinLength("one", { min: 2, unit: "words" });
    expect(short.pass).toBe(false);
    expect(short.detail).toContain("1 words, under 2");
  });

  it("passes when there is no text", () => {
    expect(withinLength(null, { min: 1 }).pass).toBe(true);
  });
});

describe("noInventedNumbers", () => {
  const sources = ["Moved about 1,200 accounts", "finished two weeks early"];

  it("passes numbers that come from the input", () => {
    expect(noInventedNumbers("Moved 1200 accounts 2 weeks early", sources).pass).toBe(true);
  });

  it("passes placeholders", () => {
    expect(noInventedNumbers("Cut reply time by [X%] for [number] users", []).pass).toBe(true);
  });

  it("names the invented numbers", () => {
    const grade = noInventedNumbers(["Moved 1,200 accounts, saving 40%."], sources);
    expect(grade.pass).toBe(false);
    expect(grade.detail).toContain("40%");
    expect(grade.detail).not.toContain("1,200 not");
  });
});

describe("novelWordsAtMost", () => {
  it("passes text drawn from the input", () => {
    const grade = novelWordsAtMost("Led the billing move", "I led the billing move last year", 0.2);
    expect(grade).toMatchObject({ name: "novel-words", pass: true });
    expect(grade.detail).toContain("0%");
  });

  it("fails text that brings in many new words", () => {
    const grade = novelWordsAtMost(
      ["Spearheaded synergy initiatives"],
      "Led the billing move",
      0.5,
    );
    expect(grade.pass).toBe(false);
    expect(grade.detail).toContain("100%");
  });
});

describe("noBannedPhrases", () => {
  it("matches plain phrases as whole words, any case and apostrophe", () => {
    expect(noBannedPhrases("I’m sorry, here it is", AI_TELLS).pass).toBe(false);
    expect(noBannedPhrases("Fixed TODOS in the tracker", ["TODO"]).pass).toBe(true);
  });

  it("takes product lists such as CLICHES and plain regexes", () => {
    const grade = noBannedPhrases(
      ["A results-driven leader", "fine"],
      [...CLICHES, /\bsynergy\b/i],
      "cliches",
    );
    expect(grade).toMatchObject({ name: "cliches", pass: false });
    expect(grade.detail).toContain('"results-driven"');
  });

  it("is not fooled by a global regex's state", () => {
    const pattern = /lorem/gi;
    expect(noBannedPhrases(["lorem one", "lorem two"], [pattern]).pass).toBe(false);
    expect(noBannedPhrases(["lorem again"], [pattern]).pass).toBe(false);
  });

  it("passes clean text", () => {
    expect(noBannedPhrases("Answered 40 customer emails a day", AI_TELLS)).toEqual({
      name: "banned-phrases",
      pass: true,
      detail: "no banned phrase",
    });
  });
});
