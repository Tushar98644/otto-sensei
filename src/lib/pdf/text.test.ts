import { describe, expect, it } from "vitest";
import { keepWordsWhole, toPdfLine, toPdfParagraphs, toPdfText } from "./text";

const char = (codePoint: number) => String.fromCodePoint(codePoint);

describe("toPdfText", () => {
  it("keeps every accented letter, Greek and Cyrillic the PDF fonts draw", () => {
    const text =
      "Café Zürich – “quotes” ‘single’ • bullets … €5 ™ © ½ Œuvre Šibenik Boğaziçi Łódź Nguyễn Ångström Øre Ţepeş Иван Ωmega ≥ ₹50";
    const lost = new Set<string>();
    expect(toPdfText(text, lost)).toBe(text);
    expect(lost.size).toBe(0);
  });

  it("swaps look-alike punctuation and spaces without reporting them", () => {
    const lost = new Set<string>();
    const text = `a${char(0x2011)}b${char(0x2212)}5 ${char(0x2032)}x${char(0x2033)} c${char(0x202f)}d${char(0x200b)}e`;
    expect(toPdfText(text, lost)).toBe(`a-b-5 'x" c de`);
    expect(lost.size).toBe(0);
  });

  it("spells out symbols the fonts lack", () => {
    expect(toPdfText("3 launches → 2x, ฿500")).toBe("3 launches -> 2x, THB 500");
  });

  it("composes decomposed accents instead of dropping them", () => {
    expect(toPdfText(`Jose${char(0x301)}`)).toBe("José");
  });

  it("expands ligatures and full-width letters", () => {
    expect(toPdfText(`${char(0xfb01)}nance ${char(0xff21)}${char(0xff22)}`)).toBe("finance AB");
  });

  it("drops emoji and scripts it can't draw, reporting what a reader would miss", () => {
    const lost = new Set<string>();
    const thumbs = `${char(0x1f44d)}${char(0x1f3fd)}`;
    expect(toPdfText(`Shipped ${char(0x1f680)} fast ${thumbs} 王芳`, lost)).toBe("Shipped  fast  ");
    expect(lost.has(char(0x1f680))).toBe(true);
    expect(lost.has("王")).toBe(true);
    expect(lost.has(char(0x1f3fd))).toBe(false);
  });

  it("drops control and private-use characters silently", () => {
    const lost = new Set<string>();
    expect(toPdfText(`a${char(0x7)}b${char(0xf0b7)}c`, lost)).toBe("abc");
    expect(lost.size).toBe(0);
  });
});

describe("toPdfLine", () => {
  it("collapses whitespace, line breaks included", () => {
    expect(toPdfLine("  Senior\tEngineer \n at   Stripe ")).toBe("Senior Engineer at Stripe");
  });
});

describe("toPdfParagraphs", () => {
  it("splits on line breaks and skips blank lines", () => {
    expect(toPdfParagraphs(`First line.\r\n\n  Second   line.${char(0x2028)}Third.`)).toEqual([
      "First line.",
      "Second line.",
      "Third.",
    ]);
  });
});

describe("keepWordsWhole", () => {
  it("never splits a normal word", () => {
    expect(keepWordsWhole("Kubernetes")).toEqual(["Kubernetes"]);
    expect(keepWordsWhole("linkedin.com/in/maya-lindqvist-a1b2c3")).toEqual(["linkedin.com/in/maya-lindqvist-a1b2c3"]);
  });

  it("gives a very long URL break points after its punctuation", () => {
    const url = "example.com/portfolio/case-studies/payments-platform-rebuild/final";
    const parts = keepWordsWhole(url);
    expect(parts.join("")).toBe(url);
    expect(parts).toContain("portfolio/");
    expect(parts.every((part) => part.length <= 24)).toBe(true);
  });

  it("cuts a long token with no punctuation into chunks", () => {
    const token = "a".repeat(60);
    expect(keepWordsWhole(token)).toEqual(["a".repeat(24), "a".repeat(24), "a".repeat(12)]);
  });
});
