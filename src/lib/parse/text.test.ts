import { describe, expect, it } from "vitest";
import { countIconGlyphs, countWords, hasReadableText, toLines } from "./text";

const char = (codePoint: number) => String.fromCodePoint(codePoint);

describe("toLines", () => {
  it("splits, trims and normalises spacing but keeps tabs between side-by-side text", () => {
    const softHyphen = char(0xad);
    const nbsp = char(0xa0);
    expect(toLines(`  Jane${nbsp}${nbsp}Doe \r\n\r\nEngi${softHyphen}neer   \t  Jan 2021\n\n`)).toEqual([
      "Jane Doe",
      "Engineer\tJan 2021",
    ]);
  });
});

describe("countWords and hasReadableText", () => {
  it("counts words with letters or digits", () => {
    expect(countWords("Built 3 APIs — fast | well")).toBe(5);
    expect(countWords("  ")).toBe(0);
  });

  it("needs a minimum amount of text per page", () => {
    expect(hasReadableText("Page 1", 1)).toBe(false);
    expect(hasReadableText("a".repeat(40), 1)).toBe(true);
    expect(hasReadableText("a".repeat(60), 3)).toBe(false);
  });
});

describe("countIconGlyphs", () => {
  it("counts icon fonts, emoji and contact symbols", () => {
    const envelope = char(0xf0e0);
    const phone = char(0x1f4de);
    expect(countIconGlyphs([`${envelope} jane@example.com ${phone} +1 555 0100`, "☎ 555 0100 ✉ jane@example.com"])).toBe(4);
  });

  it("ignores Word's bullet glyphs at the start of a line and real bullet characters", () => {
    const wordBullet = char(0xf0b7);
    expect(countIconGlyphs([`${wordBullet} Built a thing`, "• Built a thing", "✓ Shipped", "Python\t➢ Led a team"])).toBe(0);
    expect(countIconGlyphs([`Phone ${wordBullet} 555 0100`])).toBe(1);
  });

  it("counts skill ratings drawn with characters", () => {
    expect(countIconGlyphs(["Python ●●●●○", "Go ★★★☆☆"])).toBe(10);
  });
});
