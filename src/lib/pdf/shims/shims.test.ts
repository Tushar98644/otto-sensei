import { Font } from "@react-pdf/renderer";
import * as builtinHyphenation from "@react-pdf/hyphenate/en-us";
import packageRenderer from "@react-pdf/reconciler";
import { describe, expect, it } from "vitest";
import "@/components/pdf/letter-pdf";
import "@/components/pdf/resume-pdf";
import { PDF_FONT_FAMILIES } from "@/lib/pdf/fonts";
import { keepWordsWhole } from "@/lib/pdf/text";
import decompress from "./brotli-decompress";
import * as hyphenation from "./hyphenate-en-us";
import renderer from "./reconciler";

describe("browser shims for react-pdf", () => {
  it("hand react-pdf the reconciler its own picker chooses for this React", () => {
    expect(typeof renderer).toBe("function");
    expect(renderer).toBe(packageRenderer);
  });

  it("are never reached for hyphenation: every PDF registers keepWordsWhole", () => {
    expect(Font.getHyphenationCallback()).toBe(keepWordsWhole);
    expect(Object.keys(hyphenation).sort()).toEqual(Object.keys(builtinHyphenation).sort());
    expect(hyphenation.syllables("internationalization")).toEqual(["internationalization"]);
  });

  it("are never reached for WOFF2: every PDF font is TTF or OTF", () => {
    const files = Object.values(PDF_FONT_FAMILIES).flatMap((family) =>
      family.faces.map((face) => face.file),
    );
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) expect(file).toMatch(/\.(?:ttf|otf)$/);
    expect(() => decompress()).toThrow("WOFF2");
  });
});
