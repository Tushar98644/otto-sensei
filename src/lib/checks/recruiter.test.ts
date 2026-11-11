import { describe, expect, it } from "vitest";
import { extractDocument } from "@/lib/parse";
import { cleanResumePdf, noTextPdf, templateDocx, twoColumnPdf } from "@/lib/parse/test-fixtures";
import type { Extraction, ExtractionSignals } from "@/lib/parse/types";
import { runRecruiterChecks } from "./recruiter";
import type { CheckId, CheckStatus, RecruiterReport } from "./types";

const ALL_CHECKS: CheckId[] = [
  "text-layer",
  "contact-email",
  "contact-phone",
  "contact-in-header",
  "sections",
  "columns",
  "tables",
  "text-boxes",
  "images",
  "icons",
  "dates",
  "length",
  "bullets",
];

const NOW = 1_800_000_000_000;

function statuses(report: RecruiterReport): Record<CheckId, CheckStatus> {
  return Object.fromEntries(report.checks.map((check) => [check.id, check.status])) as Record<CheckId, CheckStatus>;
}

function find(report: RecruiterReport, id: CheckId) {
  const result = report.checks.find((check) => check.id === id);
  if (!result) throw new Error(`missing check ${id}`);
  return result;
}

function expectWellFormed(report: RecruiterReport, extraction: Extraction) {
  expect(report.checks.map((check) => check.id).sort()).toEqual([...ALL_CHECKS].sort());
  const rank = { fail: 0, warn: 1, pass: 2 };
  const ranks = report.checks.map((check) => rank[check.status]);
  expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  expect(report.counts.fail + report.counts.warn + report.counts.pass).toBe(ALL_CHECKS.length);
  for (const status of ["fail", "warn", "pass"] as const) {
    expect(report.counts[status]).toBe(report.checks.filter((check) => check.status === status).length);
  }
  expect(report.readText).toBe(extraction.text);
  expect(report.kind).toBe(extraction.kind);
  expect(report.pageCount).toBe(extraction.pageCount);
  expect(report.wordCount).toBe(extraction.wordCount);
  for (const check of report.checks) {
    expect(check.title.split(/\s+/).length, check.title).toBeLessThanOrEqual(6);
    const sentences = check.detail.split(/(?<=[.!?]["”]?)\s+(?=[A-Z"])/);
    expect(sentences.length, check.detail).toBeLessThanOrEqual(2);
    if (check.status === "pass") expect(check.fix).toBeNull();
    else expect(check.fix?.length, check.id).toBeGreaterThan(10);
    expect(`${check.detail} ${check.fix ?? ""}`).not.toMatch(/\b(?:all|every) (?:ats|applicant tracking|systems?)\b/i);
  }
}

async function reportFor(data: Uint8Array, filename: string) {
  const extraction = await extractDocument(data, filename);
  const report = runRecruiterChecks(extraction, NOW);
  expectWellFormed(report, extraction);
  return { extraction, report };
}

function fakeExtraction(lines: string[], overrides: Partial<Omit<Extraction, "signals">> = {}, signals: Partial<ExtractionSignals> = {}): Extraction {
  const text = lines.join("\n");
  return {
    kind: "pdf",
    text,
    lines,
    pageCount: 1,
    wordCount: text.split(/\s+/).filter(Boolean).length,
    pages: [],
    ...overrides,
    signals: {
      hasTextLayer: true,
      columnLayout: false,
      imageCount: 0,
      tableCount: 0,
      textBoxCount: 0,
      headerFooterText: "",
      iconGlyphCount: 0,
      ...signals,
    },
  };
}

const FILLER = Array.from({ length: 12 }, (_, i) => `• Shipped improvement number ${i + 1} for the billing team and its customers.`);

function resumeLines({ experience = FILLER, dates = ["Jan 2021 - Present", "Mar 2018 - Dec 2020"] } = {}): string[] {
  return [
    "Jane Doe",
    "jane@example.com | +1 555 123 4567",
    "EXPERIENCE",
    `Engineer, Acme Corp\t${dates[0]}`,
    ...experience.slice(0, Math.ceil(experience.length / 2)),
    `Developer, Beta Labs\t${dates[1]}`,
    ...experience.slice(Math.ceil(experience.length / 2)),
    "EDUCATION",
    "BSc Physics, University of Somewhere\t2014 - 2018",
    "SKILLS",
    "Python, Go, SQL",
  ];
}

describe("runRecruiterChecks on real files", () => {
  it("passes every check for a clean single-column PDF", async () => {
    const { report } = await reportFor(await cleanResumePdf(), "jane.pdf");
    expect(report.counts).toEqual({ fail: 0, warn: 0, pass: 13 });
    expect(report.sectionsFound).toEqual(["summary", "experience", "education", "skills"]);
    expect(find(report, "contact-email").detail).toContain("jane.doe@example.com");
    expect(find(report, "dates").detail).toContain("Jan 2021 - Present");
    expect(report.checkedAt).toBe(NOW);
  });

  it("warns about columns and the photo in a two-column PDF", async () => {
    const { report } = await reportFor(await twoColumnPdf(), "alex.pdf");
    expect(statuses(report)).toMatchObject({
      columns: "warn",
      images: "warn",
      "text-layer": "pass",
      "contact-email": "pass",
      "contact-phone": "pass",
      sections: "pass",
      dates: "pass",
    });
    expect(report.sectionsFound).toEqual(expect.arrayContaining(["experience", "skills", "education"]));
    expect(find(report, "images").detail).toBe("We found 1 image. Logos, photos and skill bars are invisible to hiring software.");
  });

  it("fails a PDF with no text layer and says why the rest couldn't be checked", async () => {
    const { report } = await reportFor(await noTextPdf(), "scan.pdf");
    expect(report.checks[0]).toMatchObject({
      id: "text-layer",
      status: "fail",
      detail: "Hiring software can't read any text in this file. It's probably a scan or an image.",
    });
    expect(report.counts.fail).toBe(1);
    for (const id of ["contact-email", "contact-phone", "sections", "columns", "icons", "dates", "length", "bullets"] as const) {
      expect(find(report, id).status, id).toBe("warn");
      expect(find(report, id).detail, id).toMatch(/no readable text/i);
    }
    expect(report.sectionsFound).toEqual([]);
    expect(report.readText).toBe("");
  });

  it("flags the classic Word template problems", async () => {
    const { report } = await reportFor(await templateDocx(), "sam.docx");
    expect(statuses(report)).toMatchObject({
      "text-layer": "pass",
      "contact-email": "fail",
      "contact-phone": "pass",
      "contact-in-header": "fail",
      "text-boxes": "fail",
      tables: "warn",
      columns: "warn",
      images: "pass",
      icons: "pass",
    });
    expect(find(report, "contact-in-header").detail).toBe(
      "Your email is only in the page header or footer. Many systems skip those, so they never see it.",
    );
    expect(find(report, "contact-email").fix).toBe("Move your email out of the page header and into the main text.");
    expect(find(report, "text-boxes").detail).toContain("1 text box.");
    expect(report.sectionsFound).toEqual(["experience", "skills", "education"]);
  });
});

describe("runRecruiterChecks on specific problems", () => {
  it("fails without an experience section, but only warns when there are projects", () => {
    const noJobs = runRecruiterChecks(fakeExtraction(["Jane", "jane@example.com", "EDUCATION", "BSc", "SKILLS", "Go"]), NOW);
    expect(find(noJobs, "sections").status).toBe("fail");
    const student = runRecruiterChecks(fakeExtraction(["Jane", "PROJECTS", "Chess bot", "EDUCATION", "BSc", "SKILLS", "Go"]), NOW);
    expect(find(student, "sections").status).toBe("warn");
  });

  it("warns when skills or education are missing", () => {
    const report = runRecruiterChecks(fakeExtraction(resumeLines().slice(0, -2)), NOW);
    expect(find(report, "sections")).toMatchObject({ status: "warn", title: "No Skills section" });
    expect(report.sectionsFound).toEqual(["experience", "education"]);
  });

  it("warns about mixed date formats in job history, but not about education years", () => {
    const consistent = runRecruiterChecks(fakeExtraction(resumeLines()), NOW);
    expect(find(consistent, "dates").status).toBe("pass");
    const mixed = runRecruiterChecks(fakeExtraction(resumeLines({ dates: ["Jan 2021 - Present", "03/2018 - 12/2020"] })), NOW);
    expect(find(mixed, "dates")).toMatchObject({ status: "warn", title: "Mixed date formats" });
    expect(find(mixed, "dates").detail).toContain('"03/2018"');
  });

  it("ignores years inside bullets and seasons for internships", () => {
    const lines = resumeLines({
      dates: ["Jan 2021 - Present", "Summer 2019 - Dec 2020"],
      experience: [...FILLER, "• Grew revenue from 2019 to 2021 by a third."],
    });
    expect(find(runRecruiterChecks(fakeExtraction(lines), NOW), "dates").status).toBe("pass");
  });

  it("warns when no dates are found", () => {
    const lines = resumeLines().map((line) => line.replace(/\t.*$/, ""));
    expect(find(runRecruiterChecks(fakeExtraction(lines), NOW), "dates")).toMatchObject({ status: "warn", title: "No dates found" });
  });

  it("warns about long paragraphs instead of bullets", () => {
    const paragraph = Array.from({ length: 70 }, (_, i) => `word${i}`).join(" ");
    const docx = fakeExtraction(resumeLines({ experience: [paragraph, paragraph] }), { kind: "docx" });
    expect(find(runRecruiterChecks(docx, NOW), "bullets")).toMatchObject({ status: "warn", title: "Long paragraphs in your jobs" });

    const wrapped = Array.from({ length: 4 }, (_, i) => `${"Managed the team and many projects across regions ".repeat(2)}line ${i}`);
    const pdf = fakeExtraction(resumeLines({ experience: [...wrapped, "Short end."] }));
    expect(find(runRecruiterChecks(pdf, NOW), "bullets").status).toBe("warn");

    expect(find(runRecruiterChecks(fakeExtraction(resumeLines()), NOW), "bullets").status).toBe("pass");
  });

  it("checks length in pages and words", () => {
    expect(find(runRecruiterChecks(fakeExtraction(resumeLines(), { pageCount: 3 }), NOW), "length")).toMatchObject({
      status: "warn",
      title: "Longer than two pages",
    });
    expect(find(runRecruiterChecks(fakeExtraction(["Jane", "EXPERIENCE", "Did things"]), NOW), "length")).toMatchObject({
      status: "warn",
      title: "Very little text",
    });
    expect(find(runRecruiterChecks(fakeExtraction(resumeLines()), NOW), "length").status).toBe("pass");
  });

  it("reports icons, images and tables with counts", () => {
    const report = runRecruiterChecks(
      fakeExtraction(resumeLines(), { kind: "docx" }, { iconGlyphCount: 3, imageCount: 2, tableCount: 1 }),
      NOW,
    );
    expect(find(report, "icons").detail).toContain("3 icon characters");
    expect(find(report, "images").detail).toContain("2 images");
    expect(find(report, "tables")).toMatchObject({ status: "warn", detail: expect.stringContaining("1 table.") });
  });

  it("only fails the header check when a detail is missing from the body", () => {
    const both = fakeExtraction(resumeLines(), { kind: "docx" }, { headerFooterText: "jane@example.com +1 555 123 4567" });
    expect(find(runRecruiterChecks(both, NOW), "contact-in-header").status).toBe("pass");
    const phoneOnlyInHeader = fakeExtraction(
      resumeLines().map((line) => line.replace(" | +1 555 123 4567", "")),
      { kind: "docx" },
      { headerFooterText: "Call me: +1 555 123 4567" },
    );
    const report = runRecruiterChecks(phoneOnlyInHeader, NOW);
    expect(find(report, "contact-in-header")).toMatchObject({ status: "fail" });
    expect(find(report, "contact-phone").fix).toBe("Move your phone number out of the page header and into the main text.");
  });

  it("orders checks fail, warn, pass and keeps a stable order within each", () => {
    const report = runRecruiterChecks(fakeExtraction(["Hello"], {}, { hasTextLayer: false, imageCount: 1 }), NOW);
    expectWellFormed(report, fakeExtraction(["Hello"], {}, { hasTextLayer: false, imageCount: 1 }));
    expect(report.checks.map((check) => check.id).slice(0, 2)).toEqual(["text-layer", "contact-email"]);
    expect(find(report, "images").title).toBe("Pages are images");
  });
});
