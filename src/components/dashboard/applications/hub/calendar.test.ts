import { describe, expect, it } from "vitest";
import { icsFileName, interviewIcs } from "./calendar";

const event = {
  id: "6f9619ff-8b86-4d01-b42d-00c04fc964ff",
  company: "Acme, Inc.",
  role: "Product Marketing Lead",
  jobUrl: "https://boards.example.com/acme/123",
  interviewAt: new Date(2026, 10, 23, 12).getTime(),
  prepUrl:
    "https://ottosensei.com/dashboard/applications/6f9619ff-8b86-4d01-b42d-00c04fc964ff/prep",
};
const NOW = Date.UTC(2026, 10, 21, 8, 5, 9);

function unfold(ics: string): string[] {
  return ics.replace(/\r\n /g, "").split("\r\n");
}

describe("the interview calendar file", () => {
  it("is an all-day event on the interview's local date", () => {
    const lines = unfold(interviewIcs(event, NOW));
    expect(lines[0]).toBe("BEGIN:VCALENDAR");
    expect(lines).toContain("DTSTART;VALUE=DATE:20261123");
    expect(lines).toContain("DTEND;VALUE=DATE:20261124");
    expect(lines).toContain("DTSTAMP:20261121T080509Z");
    expect(lines).toContain(`UID:interview-${event.id}@ottosensei.com`);
    expect(lines).toContain("URL:https://boards.example.com/acme/123");
    expect(lines.at(-1)).toBe("");
  });

  it("escapes text and folds long lines at 75 bytes", () => {
    const ics = interviewIcs(event, NOW);
    expect(unfold(ics)).toContain("SUMMARY:Interview: Product Marketing Lead\\, Acme\\, Inc.");
    expect(unfold(ics).find((line) => line.startsWith("DESCRIPTION:"))).toBe(
      `DESCRIPTION:Job post: ${event.jobUrl}\\nPrep: ${event.prepUrl}`,
    );
    for (const line of ics.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
  });

  it("leaves out a missing role and job link", () => {
    const lines = unfold(interviewIcs({ ...event, role: "", jobUrl: "" }, NOW));
    expect(lines).toContain("SUMMARY:Interview: Acme\\, Inc.");
    expect(lines.some((line) => line.startsWith("URL:"))).toBe(false);
  });

  it("names the file after the company", () => {
    expect(icsFileName("Acme, Inc.")).toBe("interview-acme-inc.ics");
    expect(icsFileName("  ")).toBe("interview-otto.ics");
  });
});
