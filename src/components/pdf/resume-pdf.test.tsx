import { describe, expect, it } from "vitest";
import { runRecruiterChecks } from "@/lib/checks/recruiter";
import { extractDocument } from "@/lib/parse";
import { SECTION_LABELS, type Resume } from "@/lib/resume/schema";
import {
  expectInOrder,
  flatten,
  longResume,
  open,
  readPages,
  readText,
  render,
  sampleResume,
} from "./test-fixtures";

describe("ResumePdf", () => {
  it("reads back top to bottom in the resume's section order", async () => {
    const text = flatten(await readText(await render(sampleResume())));
    expectInOrder(text, [
      "Maya Lindqvist",
      "Senior Backend Engineer",
      "Toronto, Canada • maya.lindqvist@example.com • +1 415 555 0142 • linkedin.com/in/mayalindqvist • github.com/mayal",
      "Summary",
      "Backend engineer with 7 years",
      "Experience",
      "Northwind Payments Toronto, Canada",
      "Senior Backend Engineer Jan 2021 – Present",
      "• Cut checkout latency 38%",
      "• Led the migration of 40 services",
      "• Built an internal Kubernetes deployment tool",
      "Bluefin Analytics Berlin, Germany",
      "Software Engineer Jun 2017 – Dec 2020",
      "• Mentored 4 junior engineers",
      "Projects",
      "Ledger Lint, github.com/mayal/ledger-lint",
      "Education",
      "University of Edinburgh Edinburgh, UK",
      "BSc, Computer Science 2013 – 2017",
      "Skills",
      "Languages: TypeScript, Go, SQL, Python",
      "Infrastructure: Kubernetes, AWS, Terraform, Kafka, PostgreSQL",
      "Certifications",
      "AWS Certified Solutions Architect, Amazon Web Services 2022",
    ]);
  });

  it("follows a custom section order and leaves out empty sections", async () => {
    const resume = { ...sampleResume(), projects: [], sectionOrder: ["skills", "experience", "projects", "education"] as Resume["sectionOrder"] };
    const text = flatten(await readText(await render(resume)));
    expectInOrder(text, ["Skills", "Experience", "Education"]);
    expect(text).not.toContain("Projects");
    expect(text).not.toContain("Summary");
    expect(text).not.toContain("Certifications");
  });

  it("never hyphenates a word across lines", async () => {
    const resume = sampleResume();
    const long = "Kubernetes infrastructure orchestration observability ".repeat(12).trim();
    resume.experience[0]!.bullets[0] = { id: "b1", text: long };
    resume.experience[1] = {
      ...resume.experience[1]!,
      title: "Principal Software Engineer, Payments Infrastructure and Developer Platform",
      company: "Bluefin Analytics International Holdings",
      location: "Berlin, Germany",
    };
    resume.basics.location = "Toronto, Ontario, Canada (open to relocation anywhere in Europe)";
    const text = await readText(await render(resume));
    expect(text).not.toMatch(/\p{L}-\n/u);
    expect(flatten(text)).toContain(long);
    expect(flatten(text)).toContain("Bluefin Analytics International Holdings Berlin, Germany");
    expect(flatten(text)).toContain(
      "Principal Software Engineer, Payments Infrastructure and Developer Platform",
    );
  });

  it("wraps a URL too long for one line instead of cutting it off", async () => {
    const resume = sampleResume();
    const url = `https://example.com/${"portfolio/case-studies/".repeat(6)}payments-platform-rebuild`;
    resume.basics.links = [{ id: "l1", label: "Portfolio", url }];
    const text = await readText(await render(resume));
    expect(text.replace(/-\n/g, "")).toContain(url.replace("https://", ""));
  });

  it("prints every accent, and swaps what its fonts can't draw instead of printing junk", async () => {
    const resume = sampleResume();
    resume.basics.name = "Łukasz Wójcik";
    resume.summary = "Shipped 3 launches → 2x revenue 🚀 in São Paulo and Kraków.";
    const text = flatten(await readText(await render(resume)));
    expect(text).toContain("Łukasz Wójcik");
    expect(text).toContain("Shipped 3 launches -> 2x revenue in São Paulo and Kraków.");
  });

  it("sets the title and author and uses the requested page size", async () => {
    const pdf = await open(await render(sampleResume(), "A4"));
    try {
      const { info } = await pdf.getMetadata();
      expect(info).toMatchObject({ Title: "Maya Lindqvist - Resume", Author: "Maya Lindqvist" });
      const page = await pdf.getPage(1);
      expect(page.view.map(Math.round)).toEqual([0, 0, 595, 842]);
    } finally {
      await pdf.loadingTask.destroy();
    }
  });

  it("never ends a page on a heading", async () => {
    const headings = new Set(Object.values(SECTION_LABELS));
    for (let padding = 0; padding < 8; padding++) {
      const pages = await readPages(await render(longResume(padding)));
      expect(pages.length).toBeGreaterThan(1);
      for (const page of pages.slice(0, -1)) {
        const last = page.trim().split("\n").at(-1)?.trim() ?? "";
        expect(headings.has(last), `page ends on the "${last}" heading`).toBe(false);
        expect(last, "page ends on a job heading").not.toMatch(/^(Role|Company) \d+/);
      }
    }
  });

  it("passes every recruiter check it gets re-checked with", async () => {
    const bytes = await render(sampleResume());
    const report = runRecruiterChecks(await extractDocument(bytes, "Maya-Lindqvist-Resume.pdf"));
    const notPassing = report.checks.filter((check) => check.status !== "pass").map((check) => `${check.id}: ${check.detail}`);
    expect(notPassing).toEqual([]);
    expect(report.pageCount).toBe(1);
    expect(report.sectionsFound).toEqual(["summary", "experience", "projects", "education", "skills", "certifications"]);
  });
});
