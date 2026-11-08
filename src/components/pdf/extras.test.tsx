import { describe, expect, it } from "vitest";
import { runRecruiterChecks } from "@/lib/checks/recruiter";
import { extractDocument } from "@/lib/parse";
import { PDF_PAGE_SIZES } from "@/lib/pdf/page-size";
import { TEMPLATE_IDS, type Resume, type TemplateId } from "@/lib/resume/schema";
import { flatten, open, readPages, render, richResume, sampleResume } from "./test-fixtures";

// The newer resume fields in every format: extra sections after the standard ones, the person's
// own headings, hidden things left out, look settings applied, and roles at one company under one
// company header. All still one column of real text that reads back in order.

const withTemplate = (resume: Resume, template: TemplateId): Resume => ({ ...resume, template });

function reader(text: string) {
  const lower = flatten(text).toLowerCase();
  let from = 0;
  return {
    next(part: string): number {
      const at = lower.indexOf(part.toLowerCase(), from);
      expect(at, `"${part}" should appear after position ${from}`).toBeGreaterThanOrEqual(0);
      from = at + part.length;
      return at;
    },
    count: (part: string) => lower.split(part.toLowerCase()).length - 1,
  };
}

function fontsIn(bytes: Uint8Array): string[] {
  const raw = new TextDecoder("latin1").decode(bytes);
  return [...new Set([...raw.matchAll(/\/BaseFont\s*\/([A-Za-z-]+)/g)].map((m) => m[1]!))].sort();
}

// Lowest baseline on page 1, in points from the bottom: higher means the content ends sooner.
async function lowestLine(bytes: Uint8Array): Promise<number> {
  const pdf = await open(bytes);
  try {
    const content = await (await pdf.getPage(1)).getTextContent();
    const ys = content.items.flatMap((item) =>
      "transform" in item && item.str.trim() ? [item.transform[5] as number] : [],
    );
    return Math.min(...ys);
  } finally {
    await pdf.loadingTask.destroy();
  }
}

describe.each(TEMPLATE_IDS)("%s format with the newer fields", (id) => {
  it.each(PDF_PAGE_SIZES)("reads back in order on %s", async (pageSize) => {
    const pages = await readPages(await render(withTemplate(richResume(), id), pageSize));
    const text = pages.join("\n");
    const read = reader(text);
    read.next("Maya Lindqvist");
    read.next("Summary");
    read.next("Backend engineer with 7 years");
    read.next("Work history");
    // One company header, then each role with its own dates and lines.
    read.next("Northwind Payments");
    read.next("Senior Backend Engineer");
    read.next("Jan 2021 – Present");
    read.next("Cut checkout latency 38%");
    read.next("Built an internal Kubernetes deployment tool");
    read.next("Backend Engineer");
    read.next("Mar 2019 – Dec 2020");
    read.next("Owned the ledger service");
    // A job on its own keeps its format's layout: the company before or after the dates.
    read.next("Software Engineer");
    read.next("Jun 2017 – Dec 2020");
    read.next("Designed a TypeScript and Node.js ingestion API");
    read.next("Education");
    read.next("Toolbox");
    read.next("Languages: TypeScript, Go, SQL, Python");
    read.next("Certifications");
    read.next("AWS Certified Solutions Architect");
    // Extra sections come after every standard one, in their own order.
    read.next("Languages");
    read.next("Spanish (Fluent), French (Basic)");
    read.next("Awards");
    const award = read.next("Best Paper Award");
    const note = read.next("For work on streaming ledgers.");
    for (const part of ["ACM SIGMOD", "2021"]) {
      const at = flatten(text).toLowerCase().indexOf(part.toLowerCase(), award);
      expect(at, part).toBeGreaterThan(award);
      expect(at, part).toBeLessThan(note);
    }
    read.next("Chosen from 400 submissions.");

    expect(read.count("Northwind Payments")).toBe(1);
    expect(read.count("Bluefin Analytics")).toBe(1);
    for (const hidden of [
      "Hidden line about Kafka",
      "Hidden Intern",
      "Secret Labs",
      "Hobbies",
      "Hidden Certificate",
      "Klingon",
      "Hidden Section",
      "Ledger Lint",
      "Projects",
    ]) {
      expect(flatten(text).toLowerCase(), hidden).not.toContain(hidden.toLowerCase());
    }
    // The person's headings replace the standard ones, each on a line of its own.
    const lines = new Set(text.split("\n").map((line) => line.trim().toLowerCase()));
    for (const heading of ["work history", "toolbox", "languages", "awards"]) {
      expect(lines.has(heading), heading).toBe(true);
    }
    expect(lines.has("experience")).toBe(false);
  });

  it("uses the chosen font family", async () => {
    const serif = fontsIn(await render(withTemplate(richResume(), id)));
    expect(serif.filter((font) => font.startsWith("Helvetica"))).toEqual([]);
    expect(serif).toContain("Times-Roman");
    const sans = fontsIn(
      await render(withTemplate({ ...richResume(), design: { font: "sans" } }, id)),
    );
    expect(sans.filter((font) => font.startsWith("Times"))).toEqual([]);
    expect(sans).toContain("Helvetica");
  });

  it("ends the page sooner with compact spacing", async () => {
    const resume = withTemplate({ ...richResume(), design: {} }, id);
    const normal = await lowestLine(await render(resume));
    const compact = await lowestLine(await render({ ...resume, design: { density: "compact" } }));
    expect(compact).toBeGreaterThan(normal + 10);
  });

  it("passes every recruiter check with extra sections and grouped roles", async () => {
    const resume = withTemplate(
      { ...richResume(), sectionTitles: undefined, hiddenSections: undefined },
      id,
    );
    const report = runRecruiterChecks(
      await extractDocument(await render(resume), "Maya-Lindqvist-Resume.pdf"),
    );
    const notPassing = report.checks
      .filter((check) => check.status !== "pass")
      .map((check) => `${check.id}: ${check.detail}`);
    expect(notPassing).toEqual([]);
  });

  it("never ends a page on a company header or a role", async () => {
    const resume = withTemplate(sampleResume(), id);
    resume.experience = Array.from({ length: 12 }, (_, job) => ({
      id: `job-${job}`,
      title: `Role ${job + 1}`,
      company: `Company ${Math.floor(job / 2) + 1}`,
      location: "Remote",
      startDate: `Jan ${2008 + job}`,
      endDate: `Dec ${2008 + job}`,
      bullets: Array.from({ length: 3 + (job % 2) }, (_, line) => ({
        id: `job-${job}-${line}`,
        text: "Rebuilt the onboarding flow with the design team, which raised week-one retention from 41% to 55%.",
      })),
    }));
    for (const padding of [0, 3, 6]) {
      resume.summary = [
        sampleResume().summary,
        ...Array.from({ length: padding }, (_, i) => `Extra line ${i}.`),
      ].join("\n");
      const pages = await readPages(await render(resume));
      expect(pages.length).toBeGreaterThan(1);
      for (const page of pages.slice(0, -1)) {
        const last = page.trim().split("\n").at(-1)?.trim() ?? "";
        expect(last, "page ends on a heading").not.toMatch(/^(Role|Company) \d+/);
      }
    }
  });
});
