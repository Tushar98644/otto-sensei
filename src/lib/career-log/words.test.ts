import { describe, expect, it } from "vitest";
import { formatFor } from "@/i18n/intl";
import de from "@/i18n/messages/de/career-log";
import en from "@/i18n/messages/en/career-log";
import es from "@/i18n/messages/es/career-log";
import { dayLabel, monthLabel, monthsLabel, shortMonth } from "./month";
import { checkinDayLabel } from "./schedule";

describe("career log dates and days", () => {
  it("read the same in English with or without the words", () => {
    expect(monthLabel("2026-11")).toBe("November 2026");
    expect(monthLabel("2026-11", formatFor("en"))).toBe("November 2026");
    expect(dayLabel("2026-12-07")).toBe("Mon, Dec 7");
    expect(monthsLabel(["2026-10", "2026-11"])).toBe("Oct and Nov 2026");
    const day = { week: 1, weekday: 1 } as const;
    expect(checkinDayLabel(day)).toBe("the first Monday");
    expect(checkinDayLabel(day, en.checkin, formatFor("en"))).toBe("the first Monday");
  });

  it("read in Spanish and German", () => {
    expect(monthLabel("2026-11", formatFor("es"))).toMatch(/^noviembre de 2026$/);
    expect(shortMonth("2026-11", formatFor("de"))).toMatch(/^Nov\.? 2026$/);
    expect(checkinDayLabel({ week: 1, weekday: 1 }, es.checkin, formatFor("es"))).toBe(
      "el primer lunes",
    );
    expect(checkinDayLabel({ week: 5, weekday: 5 }, de.checkin, formatFor("de"))).toBe(
      "am letzten Freitag",
    );
  });
});
