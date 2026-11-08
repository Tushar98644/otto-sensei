import { describe, expect, it } from "vitest";
import { extractPdf } from "./pdf";
import { cleanResumePdf, noTextPdf, twoColumnPdf } from "./test-fixtures";

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
    // A right-aligned date is a wide gap on the same line, kept apart by a tab.
    expect(extraction.lines).toContain("Senior Software Engineer, Acme Corp\tJan 2021 - Present");
    expect(extraction.lines).toContain("• Built a payment API in Go that handles two million requests a day with 99.99% uptime.");
    expect(extraction.text).toBe(extraction.lines.join("\n"));
    expect(extraction.wordCount).toBeGreaterThan(150);
  });

  it("exposes positioned items with a top-left origin", async () => {
    const extraction = await extractPdf(await cleanResumePdf());
    const page = extraction.pages[0];
    expect(page).toMatchObject({ pageNumber: 1, width: 612, height: 792 });
    const name = page?.items.find((item) => item.str === "Jane Doe");
    // Drawn at baseline y=740 (bottom-left origin) in 20pt type.
    expect(name).toMatchObject({ x: 50, y: 792 - 740 - 20, height: 20 });
    expect(name?.width).toBeGreaterThan(50);
    expect(page?.items.every((item) => item.y >= 0 && item.y <= 792)).toBe(true);
  });

  it("detects a two-column layout and interleaves it the way a plain parser reads it", async () => {
    const extraction = await extractPdf(await twoColumnPdf());
    expect(extraction.signals.columnLayout).toBe(true);
    expect(extraction.signals.imageCount).toBe(1);
    // Sidebar skills land on the same lines as the job history next to them.
    expect(extraction.lines).toContain("CONTACT\tEXPERIENCE");
    expect(extraction.lines).toContain("React\t• Wrote the first version of the partner API that now serves three hundred");
    expect(extraction.lines).toContain("SKILLS\t• Cut page load time in half by moving image work to a background queue.");
  });

  it("reports no text layer for a page with only shapes, without throwing", async () => {
    const extraction = await extractPdf(await noTextPdf());
    expect(extraction.pageCount).toBe(1);
    expect(extraction.text).toBe("");
    expect(extraction.lines).toEqual([]);
    expect(extraction.wordCount).toBe(0);
    expect(extraction.signals).toMatchObject({ hasTextLayer: false, columnLayout: false, imageCount: 0 });
  });

  it("leaves the caller's buffer intact", async () => {
    const data = await cleanResumePdf();
    const length = data.byteLength;
    await extractPdf(data);
    expect(data.byteLength).toBe(length);
    expect(data[0]).toBe(0x25);
  });
});
