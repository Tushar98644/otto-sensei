import { describe, expect, it } from "vitest";
import { longResume, render, sampleResume } from "@/components/pdf/test-fixtures";
import { listBullets } from "@/lib/resume/ops";
import type { Resume } from "@/lib/resume/schema";
import { withDesign } from "./design";
import { fitCandidates, hideLines, planFit, showLines } from "./fit";
import { countPdfPages } from "./pages";

const shownLines = (resume: Resume) => listBullets(resume).map((ref) => ref.bulletId);
const allLines = (resume: Resume) =>
  listBullets(resume, { includeHidden: true }).map((ref) => ref.bulletId);

function weakResume(): Resume {
  const resume = sampleResume();
  resume.experience[0]!.bullets = [
    { id: "lead", text: "Responsible for various things." },
    { id: "strong", text: "Cut checkout latency 38% by moving fraud checks into a worker pool." },
    { id: "weak", text: "Responsible for various things and helped with stuff etc." },
    { id: "ok", text: "Led the migration of 40 services to per-team databases." },
  ];
  return resume;
}

describe("fitCandidates", () => {
  it("offers the weakest lines first and never an entry's first line", () => {
    const lines = fitCandidates(weakResume());
    const ids = lines.map((line) => line.bulletId);
    expect(ids[0]).toBe("weak");
    expect(ids).not.toContain("lead");
    for (const first of ["b4", "b8"]) expect(ids).not.toContain(first);
    expect(lines[0]).toMatchObject({
      place: "Senior Backend Engineer at Northwind Payments",
      issue: expect.any(String),
      offTarget: false,
    });
  });

  it("puts later lines before earlier ones of the same strength", () => {
    const ids = fitCandidates(sampleResume()).map((line) => line.bulletId);
    expect(ids.indexOf("b6")).toBeLessThan(ids.indexOf("b5"));
  });

  it("skips hidden lines and sections", () => {
    const resume = weakResume();
    resume.experience[0]!.bullets[2]!.hidden = true;
    resume.hiddenSections = ["experience"];
    expect(fitCandidates(resume).map((line) => line.bulletId)).toEqual([]);
  });

  it("on a tailored copy, offers only lines that name none of the job's terms", () => {
    const resume: Resume = {
      ...sampleResume(),
      source: "tailored",
      tailor: {
        baseResumeId: "base",
        jobTitle: "Platform Engineer",
        company: "Globex",
        keywords: ["Kubernetes"],
        createdAt: 0,
      },
    };
    Object.assign(resume.tailor!, {
      requirements: [{ text: "AWS cost work", importance: "must", terms: ["AWS"] }],
    });
    const lines = fitCandidates(resume);
    const ids = lines.map((line) => line.bulletId);
    expect(ids).not.toContain("b3");
    expect(ids).not.toContain("b5");
    expect(ids).toContain("b2");
    expect(lines.every((line) => line.offTarget)).toBe(true);
  });
});

describe("hideLines and showLines", () => {
  it("only hides, so every line can come back", () => {
    const resume = sampleResume();
    const hidden = hideLines(resume, new Set(["b2", "b5"]));
    expect(allLines(hidden)).toEqual(allLines(resume));
    expect(shownLines(hidden)).not.toContain("b2");
    expect(shownLines(hidden)).not.toContain("b5");
    const back = showLines(hidden, new Set(["b2", "b5"]));
    expect(back.experience).toEqual(resume.experience);
  });

  it("returns the same resume when nothing changes", () => {
    const resume = sampleResume();
    expect(hideLines(resume, new Set())).toBe(resume);
    expect(showLines(resume, new Set(["b2"]))).toBe(resume);
  });
});

describe("planFit", () => {
  it("finds the fewest lines from the top of the list", async () => {
    const resume = sampleResume();
    const lines = fitCandidates(resume);
    const total = shownLines(resume).length;
    let renders = 0;
    const plan = await planFit(resume, lines, async (candidate) => {
      renders += 1;
      return shownLines(candidate).length <= total - 3 ? 1 : 2;
    });
    expect(plan).toEqual({ count: 3, fits: true });
    expect(renders).toBeLessThanOrEqual(Math.ceil(Math.log2(lines.length)) + 2);
  });

  it("says so when hiding every offered line still isn't enough", async () => {
    const resume = sampleResume();
    const lines = fitCandidates(resume);
    expect(await planFit(resume, lines, async () => 2)).toEqual({
      count: lines.length,
      fits: false,
    });
    expect(await planFit(resume, [], async () => 2)).toEqual({ count: 0, fits: false });
  });

  it("fits a real two-page resume on one page by tightening, then hiding", async () => {
    const pagesOf = async (candidate: Resume) => countPdfPages(await render(candidate));
    const resume = longResume(0);
    resume.experience = resume.experience.slice(0, 5);
    expect(await pagesOf(resume)).toBe(2);

    const tight = withDesign(resume, { density: "compact" });
    const lines = fitCandidates(tight);
    const plan = await planFit(tight, lines, pagesOf);
    expect(plan.fits).toBe(true);
    const fitted = hideLines(tight, new Set(lines.slice(0, plan.count).map((l) => l.bulletId)));
    expect(await pagesOf(fitted)).toBe(1);
    expect(allLines(fitted)).toEqual(allLines(resume));
    if (plan.count > 1) {
      const short = hideLines(
        tight,
        new Set(lines.slice(0, plan.count - 1).map((l) => l.bulletId)),
      );
      expect(await pagesOf(short)).toBe(2);
    }
  });
});
