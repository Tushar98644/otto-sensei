import { getResolvedPDFJS } from "unpdf";
import { describe, expect, it, vi } from "vitest";
import { extractPdf } from "./pdf";
import {
  cleanResumePdf,
  imagesPdf,
  linkedContactPdf,
  noTextPdf,
  twoColumnPdf,
} from "./test-fixtures";

describe("extractPdf", () => {
  it("reads a single-column resume top to bottom", async () => {
    const extraction = await extractPdf(await cleanResumePdf());
    expect(extraction.kind).toBe("pdf");
    expect(extraction.pageCount).toBe(1);
    expect(extraction.signals.hasTextLayer).toBe(true);
    expect(extraction.signals.columnLayout).toBe(false);
    expect(extraction.signals.imageCount).toBe(0);
    expect(extraction.signals.iconGlyphCount).toBe(0);
    expect(extraction.lines.slice(0, 3)).toEqual([
      "Jane Doe",
      "Senior Software Engineer",
      "jane.doe@example.com | +1 555 123 4567 | Berlin, Germany",
    ]);
    expect(extraction.lines).toContain("Senior Software Engineer, Acme Corp\tJan 2021 - Present");
    expect(extraction.lines).toContain(
      "• Built a payment API in Go that handles two million requests a day with 99.99% uptime.",
    );
    expect(extraction.text).toBe(extraction.lines.join("\n"));
    expect(extraction.wordCount).toBeGreaterThan(150);
  });

  it("exposes positioned items with a top-left origin", async () => {
    const extraction = await extractPdf(await cleanResumePdf());
    const page = extraction.pages[0];
    expect(page).toMatchObject({ pageNumber: 1, width: 612, height: 792 });
    const name = page?.items.find((item) => item.str === "Jane Doe");
    expect(name).toMatchObject({ x: 50, y: 792 - 740 - 20, height: 20 });
    expect(name?.width).toBeGreaterThan(50);
    expect(page?.items.every((item) => item.y >= 0 && item.y <= 792)).toBe(true);
  });

  it("detects a two-column layout and interleaves it the way a plain parser reads it", async () => {
    const extraction = await extractPdf(await twoColumnPdf());
    expect(extraction.signals.columnLayout).toBe(true);
    expect(extraction.signals.imageCount).toBe(1);
    expect(extraction.lines).toContain("CONTACT\tEXPERIENCE");
    expect(extraction.lines).toContain(
      "React\t• Wrote the first version of the partner API that now serves three hundred",
    );
    expect(extraction.lines).toContain(
      "SKILLS\t• Cut page load time in half by moving image work to a background queue.",
    );
  });

  it("reports no text layer for a page with only shapes, without throwing", async () => {
    const extraction = await extractPdf(await noTextPdf());
    expect(extraction.pageCount).toBe(1);
    expect(extraction.text).toBe("");
    expect(extraction.lines).toEqual([]);
    expect(extraction.wordCount).toBe(0);
    expect(extraction.signals).toMatchObject({
      hasTextLayer: false,
      columnLayout: false,
      imageCount: 0,
    });
  });

  it("counts pictures without painting pages, so a huge one is never decoded", async () => {
    const pdfjs = await getResolvedPDFJS();
    const probe = pdfjs.getDocument({ data: await cleanResumePdf() });
    const page = await (await probe.promise).getPage(1);
    const paint = vi.spyOn(Object.getPrototypeOf(page) as typeof page, "getOperatorList");
    await probe.destroy();
    try {
      const { bytes } = await imagesPdf([{ width: 30_000, height: 30_000 }]);
      const extraction = await extractPdf(bytes);
      expect(extraction.signals.imageCount).toBe(1);
      expect(extraction.lines).toEqual(["Jane Doe, Senior Software Engineer"]);
      expect(paint).not.toHaveBeenCalled();
    } finally {
      paint.mockRestore();
    }
  });

  it("leaves the caller's buffer intact", async () => {
    const data = await cleanResumePdf();
    const length = data.byteLength;
    await extractPdf(data);
    expect(data.byteLength).toBe(length);
    expect(data[0]).toBe(0x25);
  });
});

describe("extractPdf links", () => {
  it("keeps each web link with the words drawn under it", async () => {
    const result = await extractPdf(await linkedContactPdf());
    expect(result.links).toEqual([
      { url: "https://github.com/jane-doe-42", text: "github.com/jane" },
      { url: "https://www.linkedin.com/in/jane-doe/", text: "LinkedIn" },
      { url: "https://janedoe.dev/", text: "bit.ly/jane-site" },
    ]);
  });

  it("finds no links in a file without any", async () => {
    expect((await extractPdf(await cleanResumePdf())).links).toEqual([]);
  });
});
