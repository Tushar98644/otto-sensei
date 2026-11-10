import { describe, expect, it } from "vitest";
import { runRecruiterChecks } from "@/lib/checks/recruiter";
import { extractDocument } from "@/lib/parse";
import { PDF_PAGE_SIZES } from "@/lib/pdf/page-size";
import { TEMPLATE_INFO } from "@/lib/pdf/templates";
import { SECTION_LABELS, TEMPLATE_IDS, type Resume, type TemplateId } from "@/lib/resume/schema";
import { RESUME_TEMPLATE_LIST, RESUME_TEMPLATES } from "./registry";
import { yearsOnly } from "./layout";
import { TEMPLATE_THEMES } from "./themes";
import {
  flatten,
  longResume,
  open,
  readPages,
  readText,
  render,
  sampleResume,
} from "./test-fixtures";

// Every format must stay as readable to hiring software as Classic: same text, same reading order,
// standard headings on their own lines, every recruiter check passing, on Letter and on A4.

const PAGE_VIEW = { LETTER: [0, 0, 612, 792], A4: [0, 0, 595, 842] } as const;

const JOBS = [
  {
    title: "Senior Backend Engineer",
    org: "Northwind Payments",
    dates: "Jan 2021 – Present",
    bullets: [
      "Cut checkout latency 38%",
      "Led the migration of 40 services",
      "Built an internal Kubernetes deployment tool",
    ],
  },
  {
    title: "Software Engineer",
    org: "Bluefin Analytics",
    dates: "Jun 2017 – Dec 2020",
    bullets: [
      "Designed a TypeScript and Node.js ingestion API",
      "Reduced cloud costs by $180,000",
      "Mentored 4 junior engineers",
    ],
  },
];

// Formats may print headings and names in capitals, so order is checked case-insensitively.
function reader(text: string) {
  const lower = flatten(text).toLowerCase();
  let from = 0;
  return {
    // The next occurrence of `part` after everything found so far.
    next(part: string): number {
      const at = lower.indexOf(part.toLowerCase(), from);
      expect(at, `"${part}" should appear after position ${from}`).toBeGreaterThanOrEqual(0);
      from = at + part.length;
      return at;
    },
    find(part: string, after: number): number {
      return lower.indexOf(part.toLowerCase(), after);
    },
  };
}

const CONTACT: Record<"location" | "email" | "phone", string> = {
  location: "Toronto, Canada",
  email: "maya.lindqvist@example.com",
  phone: "+1 415 555 0142",
};

// The format's own order: its contact lines, and whether a job leads with the title or the company.
function expectReadingOrder(text: string, id: TemplateId) {
  const theme = TEMPLATE_THEMES[id];
  const read = reader(text);
  read.next("Maya Lindqvist");
  read.next("Senior Backend Engineer");
  for (const field of theme.contactLines.flat()) {
    if (field === "links") {
      read.next("linkedin.com/in/mayalindqvist");
      read.next("github.com/mayal");
    } else {
      read.next(CONTACT[field]);
    }
  }
  read.next(SECTION_LABELS.summary);
  read.next("Backend engineer with 7 years");
  read.next(SECTION_LABELS.experience);
  const titleFirst = theme.rows.job[0]!.lead[0] === "title";
  for (const job of JOBS) {
    const [first, second] = titleFirst ? [job.title, job.org] : [job.org, job.title];
    const start = read.next(first);
    read.next(second);
    // Dates sit in the entry's heading rows: after its first line starts, before its first bullet.
    const dates = theme.dates === "years" ? yearsOnly(job.dates) : job.dates;
    const at = read.find(dates, start);
    const firstBullet = read.find(job.bullets[0]!, start);
    expect(at, `${job.title} dates`).toBeGreaterThan(start);
    expect(at, `${job.title} dates before its first bullet`).toBeLessThan(firstBullet);
    for (const bullet of job.bullets) read.next(bullet);
  }
  read.next(SECTION_LABELS.projects);
  read.next("Ledger Lint");
  read.next("github.com/mayal/ledger-lint");
  read.next("Open-source tool that flags rounding errors");
  read.next(SECTION_LABELS.education);
  // Every format leads a school entry with the school, as its source does.
  const school = read.next("University of Edinburgh");
  expect(read.find("2013 – 2017", school), "school dates").toBeGreaterThan(school);
  read.next("BSc, Computer Science");
  read.next(SECTION_LABELS.skills);
  read.next("Languages: TypeScript, Go, SQL, Python");
  read.next("Infrastructure: Kubernetes, AWS, Terraform, Kafka, PostgreSQL");
  read.next(SECTION_LABELS.certifications);
  const certificate = read.next("AWS Certified Solutions Architect");
  expect(read.find("2022", certificate), "certificate date").toBeGreaterThan(certificate);
  read.next("Amazon Web Services");
}

function withTemplate(resume: Resume, template: TemplateId): Resume {
  return { ...resume, template };
}

describe("format registry", () => {
  it("has one entry per template id, in the schema's order", () => {
    expect(RESUME_TEMPLATE_LIST.map((template) => template.id)).toEqual([...TEMPLATE_IDS]);
    expect(Object.keys(RESUME_TEMPLATES).sort()).toEqual([...TEMPLATE_IDS].sort());
    expect(Object.keys(TEMPLATE_INFO).sort()).toEqual([...TEMPLATE_IDS].sort());
  });

  it("gives every format a distinct name and plain copy", () => {
    const names = RESUME_TEMPLATE_LIST.map((template) => template.name);
    expect(new Set(names).size).toBe(names.length);
    for (const template of RESUME_TEMPLATE_LIST) {
      expect(template.name.trim()).not.toBe("");
      expect(template.description.trim()).not.toBe("");
      expect(template.bestFor.trim()).not.toBe("");
      expect(typeof template.Component).toBe("function");
    }
  });
});

describe.each(RESUME_TEMPLATE_LIST.map((template) => [template.name, template.id] as const))(
  "%s format",
  (_name, id) => {
    it.each(PDF_PAGE_SIZES)("reads back top to bottom on %s", async (pageSize) => {
      const bytes = await render(withTemplate(sampleResume(), id), pageSize);
      const pdf = await open(bytes);
      try {
        expect((await pdf.getPage(1)).view.map(Math.round)).toEqual(PAGE_VIEW[pageSize]);
      } finally {
        await pdf.loadingTask.destroy();
      }
      const pages = await readPages(bytes);
      expect(pages).toHaveLength(1);
      expectReadingOrder(pages.join("\n"), id);
      // Each heading is a line of its own, spelled as a whole word (no "S U M M A R Y").
      const lines = new Set(pages[0]!.split("\n").map((line) => line.trim().toLowerCase()));
      for (const label of Object.values(SECTION_LABELS))
        expect(lines.has(label.toLowerCase()), label).toBe(true);
    });

    it.each(PDF_PAGE_SIZES)("passes every recruiter check on %s", async (pageSize) => {
      const bytes = await render(withTemplate(sampleResume(), id), pageSize);
      const report = runRecruiterChecks(await extractDocument(bytes, "Maya-Lindqvist-Resume.pdf"));
      const notPassing = report.checks
        .filter((check) => check.status !== "pass")
        .map((check) => `${check.id}: ${check.detail}`);
      expect(notPassing).toEqual([]);
      expect(report.sectionsFound).toEqual([
        "summary",
        "experience",
        "projects",
        "education",
        "skills",
        "certifications",
      ]);
    });

    it("follows the resume's own section order, whatever the format suggests", async () => {
      const order: Resume["sectionOrder"] = ["experience", "skills", "education"];
      const text = await readText(
        await render({ ...withTemplate(sampleResume(), id), sectionOrder: order }),
      );
      const read = reader(text);
      for (const key of order) read.next(SECTION_LABELS[key]);
      expect(flatten(text).toLowerCase()).not.toContain("ledger lint");
    });

    it("never hyphenates a word across lines", async () => {
      const resume = withTemplate(sampleResume(), id);
      const long = "Kubernetes infrastructure orchestration observability ".repeat(12).trim();
      resume.experience[0]!.bullets[0] = { id: "b1", text: long };
      resume.experience[1] = {
        ...resume.experience[1]!,
        title: "Principal Software Engineer, Payments Infrastructure and Developer Platform",
        company: "Bluefin Analytics International Holdings",
      };
      const text = await readText(await render(resume));
      expect(text).not.toMatch(/\p{L}-\n/u);
      expect(flatten(text)).toContain(long);
      expect(flatten(text)).toContain(
        "Principal Software Engineer, Payments Infrastructure and Developer Platform",
      );
    });

    it("wraps a link too long for one line instead of cutting it off", async () => {
      const resume = withTemplate(sampleResume(), id);
      const url = `https://example.com/${"portfolio/case-studies/".repeat(6)}payments-platform-rebuild`;
      resume.basics.links = [{ id: "l1", label: "Portfolio", url }];
      const text = await readText(await render(resume));
      // A break inside a token adds a hyphen at the end of the line; nothing may go missing.
      expect(text.replace(/-\n/g, "")).toContain(url.replace("https://", ""));
    });

    it.each(PDF_PAGE_SIZES)("never ends a page on a heading on %s", async (pageSize) => {
      const headings = new Set(Object.values(SECTION_LABELS).map((label) => label.toLowerCase()));
      for (const padding of [0, 2, 4, 6]) {
        const pages = await readPages(
          await render(withTemplate(longResume(padding), id), pageSize),
        );
        expect(pages.length).toBeGreaterThan(1);
        for (const page of pages.slice(0, -1)) {
          const last = page.trim().split("\n").at(-1)?.trim() ?? "";
          expect(headings.has(last.toLowerCase()), `page ends on the "${last}" heading`).toBe(
            false,
          );
          // Every format starts a job's heading rows with "Role N" or "Company N".
          expect(last, "page ends on a job heading").not.toMatch(/^(Role|Company) \d+/);
        }
      }
    });
  },
);

// The font names are written into the PDF in plain text (after a subset tag, "ABCDEF+"), so they
// show which theme drew it.
function fontsIn(bytes: Uint8Array): string[] {
  const raw = new TextDecoder("latin1").decode(bytes);
  const names = [...raw.matchAll(/\/BaseFont\s*\/(?:[A-Z]{6}\+)?([A-Za-z-]+)/g)];
  return [...new Set(names.map((match) => match[1]!))].sort();
}

const CLASSIC_FONTS = ["Carlito-Bold", "Carlito-Regular"];

describe("ResumePdf format choice", () => {
  it("uses Classic when the resume has no format saved", async () => {
    const old = sampleResume();
    delete old.template;
    expect(fontsIn(await render(old))).toEqual(CLASSIC_FONTS);
  });

  it("uses the format saved on the resume", async () => {
    expect(fontsIn(await render(withTemplate(sampleResume(), "executive")))).toContain(
      "TeXGyrePagella-Regular",
    );
    expect(fontsIn(await render(withTemplate(sampleResume(), "developer")))).toContain(
      "CMUSerif-Roman",
    );
  });

  it("lets the template prop override the saved format", async () => {
    const fonts = fontsIn(
      await render(withTemplate(sampleResume(), "executive"), "LETTER", "classic"),
    );
    expect(fonts).toEqual(CLASSIC_FONTS);
  });

  it("falls back to Classic for a format this build doesn't know", async () => {
    const stale = { ...sampleResume(), template: "retro" } as unknown as Resume;
    expect(fontsIn(await render(stale))).toEqual(CLASSIC_FONTS);
  });
});
