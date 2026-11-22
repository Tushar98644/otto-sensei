import { describe, expect, it } from "vitest";
import { cleanField, entryParagraphs, hasWords, normalizeEntry, withWordsOnly } from "./entry";
import { checkinPath, monthOfCheckinLink } from "./links";
import { addMonths, isMonth, monthLabel, monthsBetween, monthsLabel } from "./month";
import { CAREER_LOG_LIMITS } from "./types";

const EMPTY = { shipped: "", numbers: "", learned: "", nothingNew: false };

describe("an entry", () => {
  it("keeps what is typed, one field at a time", () => {
    const first = normalizeEntry(null, { shipped: "Rebuilt the signup flow" });
    expect(first).toEqual({ ...EMPTY, shipped: "Rebuilt the signup flow" });
    expect(normalizeEntry(first, { numbers: "Signups up 18%" })).toEqual({
      ...EMPTY,
      shipped: "Rebuilt the signup flow",
      numbers: "Signups up 18%",
    });
  });

  it("is gone when every word is cleared, unless it says nothing new", () => {
    const written = normalizeEntry(null, { shipped: "Shipped search" });
    expect(normalizeEntry(written, { shipped: "   " })).toBeNull();
    expect(normalizeEntry(null, {})).toBeNull();
    expect(normalizeEntry(null, { nothingNew: true })).toEqual({ ...EMPTY, nothingNew: true });
  });

  it("lets words win over Nothing new", () => {
    const quiet = normalizeEntry(null, { nothingNew: true });
    expect(normalizeEntry(quiet, { learned: "Ran the design review" })).toEqual({
      ...EMPTY,
      learned: "Ran the design review",
    });
    expect(normalizeEntry(null, { shipped: "Fixed billing", nothingNew: true })?.nothingNew).toBe(
      false,
    );
  });

  it("keeps line breaks, drops control characters and caps each answer", () => {
    expect(cleanField("one\r\ntwo\u0007")).toBe("one\ntwo");
    expect(cleanField("x".repeat(CAREER_LOG_LIMITS.fieldChars + 50))).toHaveLength(
      CAREER_LOG_LIMITS.fieldChars,
    );
  });

  it("reads as paragraphs for Otto and copies", () => {
    const entry = { shipped: "Shipped\n search", numbers: "", learned: " Led standups " };
    expect(hasWords(entry)).toBe(true);
    expect(entryParagraphs(entry)).toEqual(["Shipped search", "Led standups"]);
    expect(withWordsOnly([entry, { shipped: " ", numbers: "", learned: "" }])).toEqual([entry]);
  });
});

describe("months", () => {
  it("are YYYY-MM and count across years", () => {
    expect(isMonth("2026-11")).toBe(true);
    expect(isMonth("2026-13")).toBe(false);
    expect(isMonth("26-11")).toBe(false);
    expect(addMonths("2026-11", 2)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(monthsBetween("2025-12", "2026-11")).toBe(11);
  });

  it("read plainly", () => {
    expect(monthLabel("2026-11")).toBe("November 2026");
    expect(monthsLabel(["2026-11"])).toBe("Nov 2026");
    expect(monthsLabel(["2026-11", "2026-10"])).toBe("Oct and Nov 2026");
    expect(monthsLabel(["2026-01", "2025-12"])).toBe("Dec 2025 and Jan 2026");
  });
});

describe("the bell's check-in link", () => {
  it("names the month the Home card asks about", () => {
    expect(monthOfCheckinLink(checkinPath("2026-11"))).toBe("2026-11");
    expect(monthOfCheckinLink("/dashboard/career-log/check-in?month=2026-13")).toBeNull();
    expect(monthOfCheckinLink("/dashboard/applications")).toBeNull();
    expect(monthOfCheckinLink(null)).toBeNull();
  });
});
