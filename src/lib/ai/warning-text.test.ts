import { describe, expect, it } from "vitest";
import {
  clicheWarning,
  fillInWarning,
  liveWarnings,
  needsFirstName,
  unbackedWarning,
  verbWarning,
} from "./warning-text";

const HINT = "before you send it.";

describe("liveWarnings", () => {
  it("keeps only the blanks still in the text", () => {
    const warning = fillInWarning(["[number]", "[team name]"], HINT);
    expect(liveWarnings([warning], "Led [team name] for 3 years.")).toEqual([
      fillInWarning(["[team name]"], HINT),
    ]);
    expect(liveWarnings([warning], "Led the payments team.")).toEqual([]);
  });

  it("drops blanks another line already asks about", () => {
    const warning = fillInWarning(["[first name]", "[number]"], HINT);
    expect(
      liveWarnings([warning], "Hi [first name], I cut costs by [number].", ["[first name]"]),
    ).toEqual([fillInWarning(["[number]"], HINT)]);
  });

  it("keeps a verb warning while the sentence still upgrades the resume line", () => {
    const verb = verbWarning("led", "“Helped with the billing rebuild at Mapline”");
    expect(liveWarnings([verb], "I led the billing rebuild at Mapline.")).toEqual([verb]);
    expect(liveWarnings([verb], "I helped with the billing rebuild at Mapline.")).toEqual([]);
    expect(liveWarnings([verb], "I misled nobody about the billing rebuild.")).toEqual([]);
  });

  it("checks a cut-off resume line by the word alone, hyphenated words included", () => {
    const verb = verbWarning(
      "led",
      "“Helped with the quarterly billing rebuild across three regions and…”",
    );
    expect(liveWarnings([verb], "I led it.")).toEqual([verb]);
    expect(liveWarnings([verb], "I co-led it.")).toEqual([]);
  });

  it("keeps a claim warning while the server's pattern still matches, not just its label", () => {
    const claim = unbackedWarning("I learned");
    expect(liveWarnings([claim], "Here I've learned to ship small.")).toEqual([claim]);
    expect(liveWarnings([claim], "Here I ship small changes.")).toEqual([]);
  });

  it("keeps only the stock phrases still used", () => {
    const warning = clicheWarning(["passionate", "team player"]);
    expect(liveWarnings([warning], "I'm a team player who ships.")).toEqual([
      clicheWarning(["team player"]),
    ]);
    expect(liveWarnings([warning], "My passion is shipping.")).toEqual([
      clicheWarning(["passionate"]),
    ]);
    expect(liveWarnings([warning], "I ship small, careful changes.")).toEqual([]);
  });

  it("matches across curly apostrophes, case and line breaks", () => {
    const warning = unbackedWarning("what I’d do differently");
    expect(liveWarnings([warning], "Here's What I'd\ndo differently next time.")).toEqual([
      warning,
    ]);
    const daily = unbackedWarning("daily");
    expect(liveWarnings([daily], "I ran it every day.")).toEqual([daily]);
  });

  it("keeps a warning it can't read", () => {
    expect(liveWarnings(["Something else to check."], "")).toEqual(["Something else to check."]);
  });
});

describe("needsFirstName", () => {
  it("looks in every part of the message", () => {
    expect(needsFirstName("Subject", "Hi [first name],", "")).toBe(true);
    expect(needsFirstName("Subject", "Hi Priya,", "Hi Priya, glad to connect.")).toBe(false);
    expect(needsFirstName("", "", "Hi [First Name], hello")).toBe(true);
  });
});
