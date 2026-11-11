import JSZip from "jszip";
import mammoth from "mammoth";
import { describe, expect, it } from "vitest";
import { sampleResume } from "@/components/pdf/test-fixtures";
import { letterFileName } from "@/lib/pdf/letter";
import { buildLetterDocx, docxFileName } from "./index";

const NOW = Date.UTC(2026, 10, 7, 12);
const resume = sampleResume();
const LETTER = "Dear Northwind team,\n\nI design tools — and ship them.\nTwice a week.\n\nBest regards,\nMaya Chen";

describe("cover letter as a Word file", () => {
  it("reads as the name block, the date, then the letter's paragraphs in order", async () => {
    const bytes = await buildLetterDocx(resume, LETTER, { pageSize: "A4", now: NOW });
    const html = (await mammoth.convertToHtml({ buffer: Buffer.from(bytes) })).value;
    const text = (await mammoth.extractRawText({ buffer: Buffer.from(bytes) })).value;

    expect(text.indexOf(resume.basics.name)).toBeLessThan(text.indexOf("7 November 2026"));
    expect(text.indexOf("7 November 2026")).toBeLessThan(text.indexOf("Dear Northwind team,"));
    expect(html).toContain("<p>I design tools — and ship them.<br />Twice a week.</p>");
    expect(html).toContain("<p>Best regards,<br />Maya Chen</p>");
  });

  it("is a real package with its title set", async () => {
    const zip = await JSZip.loadAsync(await buildLetterDocx(resume, LETTER, { now: NOW }));
    const core = await zip.file("docProps/core.xml")!.async("string");
    expect(core).toContain(`<dc:title>${resume.basics.name} - Cover letter</dc:title>`);
    expect(await zip.file("word/document.xml")!.async("string")).toContain("<w:br/>");
    expect(docxFileName(letterFileName("Maya Chen", "Northwind"))).toBe(
      "Maya-Chen-Northwind-Cover-Letter.docx",
    );
  });
});
