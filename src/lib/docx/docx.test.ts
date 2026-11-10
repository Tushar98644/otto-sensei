import JSZip from "jszip";
import mammoth from "mammoth";
import { describe, expect, it } from "vitest";
import { yearsOnly } from "@/components/pdf/layout";
import { richResume, sampleResume } from "@/components/pdf/test-fixtures";
import { TEMPLATE_THEMES } from "@/components/pdf/themes";
import { PDF_PAGE_SIZES } from "@/lib/pdf/page-size";
import { TEMPLATE_IDS, type Resume } from "@/lib/resume/schema";
import { DOCX_MIME, buildResumeDocx, buildResumeDocxBlob, docxFileName } from "./index";

// The Word export read back the way hiring software reads it: mammoth (the same reader our own
// import uses) for the text and structure, jszip for the package itself.

const NOW = Date.UTC(2026, 10, 7);

async function partsOf(bytes: Uint8Array): Promise<Map<string, string>> {
  const zip = await JSZip.loadAsync(bytes);
  const parts = new Map<string, string>();
  for (const name of Object.keys(zip.files)) {
    const file = zip.files[name]!;
    if (!file.dir) parts.set(name, await file.async("string"));
  }
  return parts;
}

// Tags open and close in order, attribute values are quoted, and nothing but entities follows an
// ampersand: the mistakes that make Word call a file corrupt.
function expectWellFormed(name: string, xml: string) {
  expect(xml.startsWith("<?xml"), name).toBe(true);
  const stack: string[] = [];
  for (const match of xml
    .replace(/^<\?xml[^>]*\?>/, "")
    .matchAll(/<(\/?)([\w:.-]+)([^>]*?)(\/?)>/g)) {
    const [, closing, tag, attrs, selfClosing] = match;
    expect(attrs!.replace(/\s[\w:.-]+="[^"]*"/g, "").trim(), `${name} <${tag}> attributes`).toBe(
      "",
    );
    if (closing) expect(stack.pop(), `${name} closes ${tag}`).toBe(tag);
    else if (!selfClosing) stack.push(tag!);
  }
  expect(stack, name).toEqual([]);
  expect(xml.replace(/&(?:amp|lt|gt|quot|apos|#\d+);/g, "")).not.toContain("&");
}

async function rawText(bytes: Uint8Array): Promise<string> {
  return (await mammoth.extractRawText({ buffer: Buffer.from(bytes) })).value;
}

async function html(bytes: Uint8Array): Promise<string> {
  return (await mammoth.convertToHtml({ buffer: Buffer.from(bytes) })).value;
}

function reader(text: string) {
  const flat = text.replace(/\s+/g, " ").toLowerCase();
  let from = 0;
  return (part: string) => {
    const at = flat.indexOf(part.toLowerCase(), from);
    expect(at, `"${part}" should appear after position ${from}`).toBeGreaterThanOrEqual(0);
    from = at + part.length;
  };
}

describe("buildResumeDocx", () => {
  it("writes a complete, well-formed package", async () => {
    const parts = await partsOf(await buildResumeDocx(richResume(), { now: NOW }));
    for (const [name, xml] of parts) expectWellFormed(name, xml);

    const types = parts.get("[Content_Types].xml")!;
    for (const [, part] of types.matchAll(/PartName="\/([^"]+)"/g)) {
      expect(parts.has(part!), part).toBe(true);
    }
    expect(types).toContain('Extension="rels"');

    const rootTargets = [...parts.get("_rels/.rels")!.matchAll(/Target="([^"]+)"/g)].map(
      (m) => m[1],
    );
    expect(rootTargets).toEqual(["word/document.xml", "docProps/core.xml", "docProps/app.xml"]);
    const docRels = parts.get("word/_rels/document.xml.rels")!;
    for (const [, target, mode] of docRels.matchAll(/Target="([^"]+)"(?: TargetMode="(\w+)")?/g)) {
      if (mode === "External") expect(target).toMatch(/^(?:https?:|mailto:)/);
      else expect(parts.has(`word/${target}`), target).toBe(true);
    }
    // Every hyperlink in the body points at a relationship that exists.
    const document = parts.get("word/document.xml")!;
    for (const [, id] of document.matchAll(/<w:hyperlink r:id="(\w+)"/g)) {
      expect(docRels).toContain(`Id="${id}"`);
    }
    expect(parts.get("docProps/core.xml")).toContain(
      "<dc:title>Maya Lindqvist - Resume</dc:title>",
    );
    expect(parts.get("docProps/core.xml")).toContain("2026-11-07T00:00:00Z");
  });

  it("makes a Word blob with the right type and file name", async () => {
    const blob = await buildResumeDocxBlob(sampleResume(), { now: NOW });
    expect(blob.type).toBe(DOCX_MIME);
    expect(new Uint8Array(await blob.arrayBuffer()).subarray(0, 2)).toEqual(
      new Uint8Array([0x50, 0x4b]),
    );
    expect(docxFileName("Maya-Lindqvist-Resume.pdf")).toBe("Maya-Lindqvist-Resume.docx");
  });

  describe.each(TEMPLATE_IDS)("%s format", (template) => {
    it.each(PDF_PAGE_SIZES)("reads back in the PDF's order on %s", async (pageSize) => {
      const resume: Resume = { ...richResume(), template };
      const bytes = await buildResumeDocx(resume, { pageSize, now: NOW });
      const text = await rawText(bytes);
      const next = reader(text);
      const theme = TEMPLATE_THEMES[template];
      const dates = (value: string) => (theme.dates === "years" ? yearsOnly(value) : value);
      // The format's own order (see the PDF tests): a company line first, or the first role in
      // full with the company under its title; dates on the company's line or the title's.
      const run = theme.companyRow
        ? ["Northwind Payments", "Senior Backend Engineer", dates("Jan 2021 – Present")]
        : ["Senior Backend Engineer", dates("Jan 2021 – Present"), "Northwind Payments"];
      const [lead] = theme.rows.job;
      const single =
        lead!.lead[0] === "title"
          ? ["Software Engineer", "Bluefin Analytics"]
          : lead!.side === "dates"
            ? ["Bluefin Analytics", dates("Jun 2017 – Dec 2020"), "Software Engineer"]
            : ["Bluefin Analytics", "Software Engineer"];
      for (const part of [
        "Maya Lindqvist",
        "Senior Backend Engineer",
        "maya.lindqvist@example.com",
        "linkedin.com/in/mayalindqvist",
        "Summary",
        "Backend engineer with 7 years",
        "Work history",
        ...run,
        "Cut checkout latency 38%",
        "Backend Engineer",
        dates("Mar 2019 – Dec 2020"),
        "Owned the ledger service",
        ...single,
        "Designed a TypeScript and Node.js ingestion API",
        "Education",
        "University of Edinburgh",
        "Toolbox",
        "Languages: TypeScript, Go, SQL, Python",
        "Certifications",
        "AWS Certified Solutions Architect",
        "Languages",
        "Spanish (Fluent), French (Basic)",
        "Awards",
        "Best Paper Award",
        "For work on streaming ledgers.",
        "Chosen from 400 submissions.",
      ]) {
        next(part);
      }
      const flat = text.toLowerCase();
      // Stacked formats put the dates beside the title and the issuer under it; both sit between
      // the award and its note either way.
      const award = flat.indexOf("best paper award");
      const note = flat.indexOf("for work on streaming ledgers.");
      for (const part of ["acm sigmod", "2021"]) {
        const at = flat.indexOf(part, award);
        expect(at, part).toBeGreaterThan(award);
        expect(at, part).toBeLessThan(note);
      }
      for (const hidden of [
        "Hidden line",
        "Hidden Intern",
        "Hobbies",
        "Klingon",
        "Hidden Section",
        "Ledger Lint",
      ]) {
        expect(flat, hidden).not.toContain(hidden.toLowerCase());
      }
      // One company header over both roles.
      expect(flat.split("northwind payments").length - 1).toBe(1);

      const page = (await partsOf(bytes)).get("word/document.xml")!;
      expect(page).toContain(
        pageSize === "A4"
          ? '<w:pgSz w:w="11906" w:h="16838"/>'
          : '<w:pgSz w:w="12240" w:h="15840"/>',
      );
    });

    it("uses headings, a real bulleted list and tab stops for dates", async () => {
      const resume: Resume = { ...richResume(), template };
      const bytes = await buildResumeDocx(resume, { now: NOW });
      // A rule running from the heading to the margin is a tab leader in Word.
      const markup = (await html(bytes)).replace(/\t<\/h1>/g, "</h1>");
      for (const heading of [
        "Summary",
        "Work history",
        "Education",
        "Toolbox",
        "Certifications",
        "Languages",
        "Awards",
      ]) {
        expect(markup).toContain(`<h1>${heading}</h1>`);
      }
      expect(markup).toMatch(/<ul><li>Cut checkout latency 38%[^<]*<\/li><li>Led the migration/);
      expect(markup).toContain("<li>Chosen from 400 submissions.</li>");

      const parts = await partsOf(bytes);
      const styles = parts.get("word/styles.xml")!;
      expect(styles).toContain(
        '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/>',
      );
      expect(styles).toMatch(
        /w:styleId="EntryHeading">.*?<w:tabs><w:tab w:val="right" w:pos="\d+"\/><\/w:tabs>/,
      );
      expect(parts.get("word/numbering.xml")).toContain('<w:numFmt w:val="bullet"/>');
      // The dates follow a tab in the same run, so a parser keeps them as one piece.
      const dates =
        TEMPLATE_THEMES[template].dates === "years" ? "2021 – Present" : "Jan 2021 – Present";
      expect(parts.get("word/document.xml")).toContain(
        `<w:tab/><w:t xml:space="preserve">${dates}</w:t>`,
      );
    });

    it("uses the resume's font and accent", async () => {
      const styled: Resume = {
        ...richResume(),
        template,
        design: { accent: "burgundy", font: "serif" },
      };
      const serif = (await partsOf(await buildResumeDocx(styled, { now: NOW }))).get(
        "word/styles.xml",
      )!;
      expect(serif).toMatch(
        /<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman"/,
      );
      // Modern colors only the first letters of each heading; the others the whole heading.
      const accentOnHeading = (styles: string, document: string, hex: string) =>
        template === "modern"
          ? expect(document).toMatch(
              new RegExp(`<w:color w:val="${hex}"/></w:rPr><w:t xml:space="preserve">Sum</w:t>`),
            )
          : expect(/w:styleId="Heading1">.*?<\/w:style>/.exec(styles)![0]).toContain(
              `<w:color w:val="${hex}"/>`,
            );
      const serifParts = await partsOf(await buildResumeDocx(styled, { now: NOW }));
      accentOnHeading(serif, serifParts.get("word/document.xml")!, "6B1D2A");

      const sansParts = await partsOf(
        await buildResumeDocx(
          { ...styled, design: { accent: "forest", font: "sans" } },
          { now: NOW },
        ),
      );
      const sans = sansParts.get("word/styles.xml")!;
      expect(sans).toMatch(/<w:rFonts w:ascii="Calibri"/);
      expect(sans).not.toContain("Times New Roman");
      accentOnHeading(sans, sansParts.get("word/document.xml")!, "0E3B2E");
    });
  });

  it("keeps characters the PDF fonts can't draw", async () => {
    const resume = sampleResume();
    resume.basics.name = "Zoë Łukasiewicz";
    resume.summary = "Built tools for teams in 東京 and São Paulo.";
    const text = await rawText(await buildResumeDocx(resume, { now: NOW }));
    expect(text).toContain("Zoë Łukasiewicz");
    expect(text).toContain("東京");
  });

  it("escapes text that looks like markup", async () => {
    const resume = sampleResume();
    resume.summary = 'Shipped <script> & "quotes" safely.';
    const bytes = await buildResumeDocx(resume, { now: NOW });
    expectWellFormed("document", (await partsOf(bytes)).get("word/document.xml")!);
    expect(await rawText(bytes)).toContain('Shipped <script> & "quotes" safely.');
  });
});
