import { describe, expect, it } from "vitest";
import { appendDictation, joinDictation } from "./join";

describe("joinDictation", () => {
  it("starts an empty box with a capital letter", () => {
    expect(joinDictation("", "  trained three new hires ")).toBe("Trained three new hires");
    expect(joinDictation("   ", "led the team")).toBe("Led the team");
  });

  it("adds one space and keeps going mid-sentence", () => {
    expect(joinDictation("Answered customer emails", "about forty a day")).toBe(
      "Answered customer emails about forty a day",
    );
    expect(joinDictation("Answered customer emails   ", "  about   forty a day")).toBe(
      "Answered customer emails about forty a day",
    );
  });

  it("capitalizes after a sentence ends", () => {
    expect(joinDictation("We need a designer.", "knows Figma")).toBe(
      "We need a designer. Knows Figma",
    );
    expect(joinDictation("Why this job?", "the team")).toBe("Why this job? The team");
    expect(joinDictation("She said “yes.”", "then left")).toBe("She said “yes.” Then left");
  });

  it("starts a new line without a leading space", () => {
    expect(joinDictation("Dear team,\n", "thank you")).toBe("Dear team,\nThank you");
  });

  it("never lowers what the browser capitalized", () => {
    expect(joinDictation("Worked with", "Google Cloud")).toBe("Worked with Google Cloud");
  });

  it("leaves letters with no case alone", () => {
    expect(joinDictation("", "写了报告")).toBe("写了报告");
    expect(joinDictation("", "1,200 orders")).toBe("1,200 orders");
  });

  it("puts punctuation right after the last word", () => {
    expect(joinDictation("Cut costs", ", then hired two")).toBe("Cut costs, then hired two");
  });

  it("ignores empty chunks", () => {
    expect(joinDictation("Kept as is ", "   ")).toBe("Kept as is ");
  });
});

describe("appendDictation", () => {
  it("appends in full when there is room", () => {
    expect(appendDictation("Hello", "world", 20)).toEqual({ text: "Hello world", full: false });
    expect(appendDictation("Hello", "world")).toEqual({ text: "Hello world", full: false });
  });

  it("keeps whole words that fit and says the box is full", () => {
    expect(appendDictation("Hello", "world and more", 14)).toEqual({
      text: "Hello world",
      full: true,
    });
  });

  it("adds nothing when not even one word fits", () => {
    expect(appendDictation("Hello", "wonderful", 8)).toEqual({ text: "Hello", full: true });
    expect(appendDictation("Already full", "more", 12)).toEqual({
      text: "Already full",
      full: true,
    });
  });

  it("fills to the exact limit", () => {
    expect(appendDictation("Hi", "there", 8)).toEqual({ text: "Hi there", full: false });
  });
});
