import { describe, expect, it } from "vitest";
import { letterBlocks, letterDate, letterFileName } from "./letter";

describe("letterBlocks", () => {
  it("splits paragraphs on blank lines and keeps single breaks inside one", () => {
    expect(
      letterBlocks("Dear Kestrel Labs team,\n\nI rebuilt   the billing service.\n \nBest regards,\nSam Rivera\n\n\n"),
    ).toEqual([["Dear Kestrel Labs team,"], ["I rebuilt the billing service."], ["Best regards,", "Sam Rivera"]]);
  });

  it("swaps characters the PDF font can't draw and reports the ones a reader would notice", () => {
    const lost = new Set<string>();
    const [block] = letterBlocks("I shipped it 🚀 on time.", lost);
    expect(block?.[0]).not.toContain("🚀");
    expect(lost.has("🚀")).toBe(true);
  });
});

describe("letterDate and letterFileName", () => {
  it("writes the date the way each page size's readers do", () => {
    const day = Date.UTC(2026, 10, 7, 12);
    expect(letterDate(day, "LETTER")).toBe("November 7, 2026");
    expect(letterDate(day, "A4")).toBe("7 November 2026");
  });

  it("names the file after the person and the company", () => {
    expect(letterFileName("Zoë Álvarez", "Kestrel Labs, Inc.")).toBe("Zoe-Alvarez-Kestrel-Labs-Inc-Cover-Letter.pdf");
    expect(letterFileName("", "")).toBe("Cover-Letter.pdf");
  });
});
