import JSZip from "jszip";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cpuMsAsync } from "@/lib/timing-testing";
import { extractDocx } from "./docx";
import { ParseError } from "./types";
import { buildDocx, paragraph, templateDocx } from "./test-fixtures";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("extractDocx", () => {
  it("reads the body and the layout signals of a Word template", async () => {
    const extraction = await extractDocx(await templateDocx());
    expect(extraction.kind).toBe("docx");
    expect(extraction.pages).toEqual([]);
    expect(extraction.signals).toMatchObject({
      hasTextLayer: true,
      columnLayout: true,
      tableCount: 1,
      textBoxCount: 1,
      imageCount: 0,
      iconGlyphCount: 0,
      headerFooterText: "sam.rivera@example.com",
    });
    expect(extraction.text).not.toContain("sam.rivera@example.com");
    expect(extraction.lines.slice(0, 3)).toEqual(["Sam Rivera", "San Francisco, CA | +1 (415) 555-0134", "Experience"]);
    expect(extraction.lines).toContain("Lead Developer, Contoso Ltd");
    expect(extraction.lines.filter((line) => line.includes("Tableau"))).toHaveLength(1);
  });

  it("keeps soft line breaks as separate lines instead of gluing words together", async () => {
    const extraction = await extractDocx(await templateDocx());
    expect(extraction.lines).toContain("Built a hiring dashboard used by 300 recruiters.");
    expect(extraction.lines).toContain("Cut report time from hours to minutes.");
  });

  it("uses the saved page count, or estimates one from the words", async () => {
    const saved = await extractDocx(await buildDocx({ body: paragraph("Hello there, this is a resume."), pages: 2 }));
    expect(saved.pageCount).toBe(2);
    const estimated = await extractDocx(await buildDocx({ body: paragraph("Short resume text here.") }));
    expect(estimated.pageCount).toBe(1);
    expect(estimated.signals.columnLayout).toBe(false);
    expect(estimated.signals.headerFooterText).toBe("");
  });

  it("counts icon glyphs but not Word bullet glyphs", async () => {
    const body = [
      paragraph("\uf0e0 jane@example.com  ☎ +1 555 123 4567"),
      paragraph("\uf0b7 Led the migration to a new billing system"),
      paragraph("Ratings: Python ●●●●○"),
    ].join("");
    const extraction = await extractDocx(await buildDocx({ body }));
    expect(extraction.signals.iconGlyphCount).toBe(2 + 5);
  });

  it("rejects a package without a main document", async () => {
    const zip = new JSZip();
    zip.file("[Content_Types].xml", "<Types/>");
    zip.file("word/styles.xml", "<w:styles/>");
    const data = await zip.generateAsync({ type: "uint8array" });
    await expect(extractDocx(data)).rejects.toMatchObject({ code: "corrupt" });
  });

  it("refuses to inflate an oversized part (zip bomb)", async () => {
    const zip = new JSZip();
    zip.file("word/document.xml", `<w:document>${" ".repeat(11 * 1024 * 1024)}</w:document>`);
    const data = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
    expect(data.byteLength).toBeLessThan(100_000);
    const error = await extractDocx(data).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ParseError);
    expect(error).toMatchObject({ code: "corrupt" });
  });

  it("refuses parts far bigger than any resume needs", async () => {
    const zip = new JSZip();
    zip.file("word/document.xml", `<w:document>${" ".repeat(3 * 1024 * 1024)}</w:document>`);
    const data = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
    await expect(extractDocx(data)).rejects.toMatchObject({ code: "corrupt" });
  });

  it("stays fast on a header or body full of unclosed tags", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const junk = "<w:br ".repeat(300_000);
    const withJunk = async (part: string, xml: string) => {
      const zip = await JSZip.loadAsync(await buildDocx({ body: paragraph("Sam Rivera"), header: "Sam" }));
      zip.file(part, xml);
      return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
    };
    const header = await withJunk(
      "word/header1.xml",
      `<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${junk}`,
    );
    const body = await withJunk("word/document.xml", `<w:document><w:body>${junk}`);
    expect(header.byteLength).toBeLessThan(50_000);

    const spent = await cpuMsAsync(async () => {
      const extraction = await extractDocx(header);
      expect(extraction.lines).toEqual(["Sam Rivera"]);
      expect(extraction.signals.headerFooterText).toBe("");
      await expect(extractDocx(body)).rejects.toMatchObject({ code: "corrupt" });
    });
    expect(spent).toBeLessThan(3_000);
  });

  it("rejects bytes that aren't a zip", async () => {
    const data = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 4, 5, 6, 7, 8]);
    await expect(extractDocx(data)).rejects.toMatchObject({ code: "corrupt" });
  });
});
