import { describe, expect, it } from "vitest";
import { gotCount, parsePractice, practiceCount, practiceKey } from "./practice-store";

describe("practice progress", () => {
  it("belongs to one pack, so a new pack starts fresh", () => {
    expect(practiceKey("c02e", 1795)).toBe("otto-prep-practice-v1:c02e:1795");
  });

  it("keeps only the marks and answers it understands", () => {
    expect(
      parsePractice({
        marks: { a: "got", b: "again", c: "maybe", d: 3 },
        answers: { a: "I led the launch.", b: "", c: 4 },
      }),
    ).toEqual({ marks: { a: "got", b: "again" }, answers: { a: "I led the launch." } });
    expect(parsePractice(null)).toEqual({ marks: {}, answers: {} });
    expect(parsePractice([1, 2])).toEqual({ marks: {}, answers: {} });
  });

  it("counts the questions marked got it", () => {
    const record = parsePractice({ marks: { a: "got", b: "again", gone: "got" } });
    expect(practiceCount(record, ["a", "b", "c"])).toBe(1);
    expect(gotCount(record)).toBe(2);
  });
});
