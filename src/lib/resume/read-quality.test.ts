import { describe, expect, it } from "vitest";
import { extractDocument } from "@/lib/parse";
import { cleanResumePdf, templateDocx, twoColumnPdf } from "@/lib/parse/test-fixtures";
import { jordanV2Resume } from "@/lib/portfolio/fixtures/jordan";
import { heuristicParse } from "./heuristic-parse";
import { resumeToText } from "./ops";
import { weakReadSigns, type ReadLayout } from "./read-quality";
import { createSampleResume } from "./sample";

const NOW = Date.UTC(2026, 10, 9);

function signsFor(text: string, layout?: ReadLayout) {
  return weakReadSigns(text, heuristicParse(text, NOW), layout);
}

async function signsForFile(bytes: Uint8Array, name: string) {
  const extraction = await extractDocument(bytes, name);
  const { kind, signals } = extraction;
  const text = [signals.headerFooterText, extraction.text].filter(Boolean).join("\n");
  return signsFor(text, {
    mixedColumns: kind === "pdf" && signals.columnLayout,
    textBoxes: kind === "docx" && signals.textBoxCount > 0,
  });
}

describe("weakReadSigns on the cost audit's files", () => {
  it("keeps the rules read of a clean one-column PDF", async () => {
    expect(await signsForFile(await cleanResumePdf(), "jane-doe.pdf")).toEqual([]);
  });

  it("keeps the rules read of Jordan's resume, which matched the AI's on jobs, lines and skills", () => {
    expect(signsFor(resumeToText(jordanV2Resume()))).toEqual([]);
  });

  it("sends the two-column PDF to the AI: 0 jobs and a summary full of headings and contacts", async () => {
    expect(await signsForFile(await twoColumnPdf(), "two-column.pdf")).toEqual([
      "mixed_columns",
      "no_jobs",
      "unsorted_summary",
    ]);
  });

  it("sends a Word template with a text box to the AI, whose skills box landed in a job", async () => {
    expect(await signsForFile(await templateDocx(), "template.docx")).toEqual(["text_boxes"]);
  });

  it("keeps the rules read of the sample resume", () => {
    expect(signsFor(resumeToText(createSampleResume(NOW)))).toEqual([]);
  });
});

describe("weakReadSigns, one sign at a time", () => {
  const header = ["Sam Rivera", "sam@example.com | +1 415 555 0134", ""];
  const job = [
    "EXPERIENCE",
    "Lead Developer, Contoso Ltd",
    "Feb 2019 - Present",
    "• Built a hiring dashboard used by 300 recruiters.",
  ];

  it("finds nothing wrong with a plain one-job resume", () => {
    expect(
      signsFor(
        [...header, ...job, "", "EDUCATION", "BA Economics, University of Somewhere, 2018"].join(
          "\n",
        ),
      ),
    ).toEqual([]);
  });

  it("flags text with no headings at all, which ends up in the summary", () => {
    const text = [
      ...header,
      "Lead Developer at Contoso from Feb 2019 to now, building tools for recruiters.",
      "Before that I was an analyst at Fabrikam for three years.",
    ].join("\n");
    expect(signsFor(text)).toContain("no_jobs");
  });

  it("flags a section heading whose lines came out empty, but not an empty heading", () => {
    const text = [...header, ...job, "", "SKILLS", "Python, SQL"].join("\n");
    const resume = heuristicParse(text, NOW);
    expect(weakReadSigns(text, resume)).toEqual([]);
    expect(weakReadSigns(text, { ...resume, skills: [] })).toEqual(["empty_section"]);
    expect(signsFor([...header, ...job, "", "PROJECTS"].join("\n"))).toEqual([]);
  });

  it("doesn't count volunteer work as a missing job list", () => {
    const text = [
      ...header,
      ...job,
      "",
      "VOLUNTEER EXPERIENCE",
      "Mentor, Code Club",
      "2020 - Present",
    ].join("\n");
    expect(signsFor(text)).not.toContain("empty_section");
  });

  it("flags jobs with no title and no company, and jobs without a single line", () => {
    const resume = heuristicParse([...header, ...job].join("\n"), NOW);
    const [first] = resume.experience;
    if (!first) throw new Error("expected a job");
    const text = [...header, ...job].join("\n");
    expect(
      weakReadSigns(text, { ...resume, experience: [{ ...first, title: "", company: "" }] }),
    ).toEqual(["nameless_job"]);
    expect(weakReadSigns(text, { ...resume, experience: [{ ...first, bullets: [] }] })).toEqual([
      "lineless_jobs",
    ]);
  });

  it("allows one date range in a summary but not a pasted job list, headings or an email", () => {
    const resume = heuristicParse([...header, ...job].join("\n"), NOW);
    const text = [...header, ...job].join("\n");
    const withSummary = (summary: string) => weakReadSigns(text, { ...resume, summary });
    expect(withSummary("From 2019 to 2021 I led the analytics team at a bank.")).toEqual([]);
    expect(withSummary("I ship AWS and SQL work for teams of every size.")).toEqual([]);
    expect(
      withSummary("Engineer, Acme Jan 2020 - Present. Analyst, Beta Mar 2017 - Dec 2019."),
    ).toEqual(["unsorted_summary"]);
    expect(withSummary("CONTACT EXPERIENCE Senior Product Engineer, Northwind")).toEqual([
      "unsorted_summary",
    ]);
    expect(withSummary("Reach me at sam@example.com for more.")).toEqual(["unsorted_summary"]);
  });

  it("flags a layout that mixes the reading order, whatever the read found", () => {
    const text = [...header, ...job].join("\n");
    expect(signsFor(text, { mixedColumns: true })).toEqual(["mixed_columns"]);
    expect(signsFor(text, { textBoxes: true })).toEqual(["text_boxes"]);
  });
});
