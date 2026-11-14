import { describe, expect, it } from "vitest";
import { countPdfImages } from "./pdf-images";
import { cleanResumePdf, imagesPdf, noTextPdf, twoColumnPdf } from "./test-fixtures";

const bytes = (text: string) => new TextEncoder().encode(text);

describe("countPdfImages", () => {
  it("finds no pictures in files without any", async () => {
    expect(countPdfImages(await cleanResumePdf())).toBe(0);
    expect(countPdfImages(await noTextPdf())).toBe(0);
  });

  it("counts a photo once, not its transparency mask", async () => {
    expect(countPdfImages(await twoColumnPdf())).toBe(1);
  });

  it("counts each distinct picture once, however often it is drawn", async () => {
    const { bytes: file } = await imagesPdf(
      [
        { width: 24, height: 24, onPages: [0, 1] },
        { width: 600, height: 600 },
      ],
      { pages: 2 },
    );
    expect(countPdfImages(file)).toBe(2);
  });

  it("reads pictures the same with and without object streams", async () => {
    const images = [{ width: 48, height: 48 }];
    expect(countPdfImages((await imagesPdf(images, { objectStreams: true })).bytes)).toBe(1);
    expect(countPdfImages((await imagesPdf(images, { objectStreams: false })).bytes)).toBe(1);
  });

  it("leaves out 1x1 stencil masks, which draw as plain fills", async () => {
    const { bytes: file } = await imagesPdf([
      { width: 1, height: 1, stencil: true },
      { width: 16, height: 16, stencil: true },
    ]);
    expect(countPdfImages(file)).toBe(1);
  });

  it("leaves out pictures that only draw a Type3 glyph, like a printed emoji", async () => {
    const { bytes: file } = await imagesPdf([{ width: 72, height: 72, glyph: true }], {
      objectStreams: false,
    });
    expect(countPdfImages(file)).toBe(0);
  });

  it("still counts a glyph's picture that the page draws too, and the page's own", async () => {
    const { bytes: file } = await imagesPdf(
      [
        { width: 72, height: 72, glyph: true, onPages: [0] },
        { width: 48, height: 48 },
      ],
      { objectStreams: false },
    );
    expect(countPdfImages(file)).toBe(2);
  });

  it("goes by the latest copy of an object saved again", async () => {
    const { bytes: file, ids } = await imagesPdf([{ width: 48, height: 48 }], {
      objectStreams: false,
    });
    const update = `\n${ids[0]} 0 obj\n<< /Type /XObject /Subtype /Form /BBox [0 0 1 1] /Length 0 >>\nstream\n\nendstream\nendobj\n`;
    expect(countPdfImages(new Uint8Array([...file, ...bytes(update)]))).toBe(0);
  });

  it("counts a huge picture from its dictionary alone", async () => {
    expect(countPdfImages((await imagesPdf([{ width: 30_000, height: 30_000 }])).bytes)).toBe(1);
  });

  it("stays quick on junk the size of an upload", () => {
    const size = 4 * 1024 * 1024;
    const started = Date.now();
    expect(countPdfImages(bytes("7".repeat(size)))).toBe(0);
    expect(countPdfImages(bytes("1 0 obj ".repeat(size / 8)))).toBe(0);
    expect(countPdfImages(bytes(`1${" ".repeat(size / 2)}2${" ".repeat(size / 2)}`))).toBe(0);
    expect(countPdfImages(bytes("<< /Subtype /Image >> stream\n".repeat(size / 30)))).toBe(0);
    const pages = (from: number, count: number) =>
      Array.from({ length: count }, (_, i) => `${from + i} 0 obj<</Type/Page 1 0 R>>endobj`);
    for (const font of ["", "/Subtype /Type3 "]) {
      const hub = `1 0 obj << ${font}${"2 0 R ".repeat(size / 12)}>> endobj\n`;
      const file = [hub, ...pages(10, size / 80)].join("\n");
      expect(countPdfImages(bytes(file))).toBe(0);
    }
    expect(Date.now() - started).toBeLessThan(2_000);
  });
});
