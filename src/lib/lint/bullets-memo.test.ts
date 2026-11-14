import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setBulletText } from "@/lib/resume/ops";
import { emptyResume, newBullet, newExperience, type Resume } from "@/lib/resume/schema";

const counter = vi.hoisted(() => ({ tokenized: 0 }));
vi.mock("./bullets/tokens", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./bullets/tokens")>();
  return {
    ...actual,
    tokenize: (text: string) => {
      counter.tokenized += 1;
      return actual.tokenize(text);
    },
  };
});

const { lintResume, lintSummary } = await import("./bullets");

let run = 0;

function resumeOf(lines: number): { resume: Resume; ids: string[] } {
  run += 1;
  const bullets = Array.from({ length: lines }, (_, index) => {
    const n = run * 1000 + index * 10;
    return newBullet(`Cut costs ${n}% for ${n + 1} teams in ${n + 2} weeks`);
  });
  const job = { ...newExperience(), endDate: "2024", bullets };
  return { resume: { ...emptyResume(0), experience: [job] }, ids: bullets.map((b) => b.id) };
}

function tokenizedBy(work: () => void): number {
  const before = counter.tokenized;
  work();
  return counter.tokenized - before;
}

describe("lintResume in the browser", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("analyzes only the edited line again", () => {
    const { resume, ids } = resumeOf(30);
    const edited = ids[4]!;
    const first = lintResume(resume);
    const typed = setBulletText(resume, edited, "Responsible for the deploy scripts");
    let second = first;
    expect(tokenizedBy(() => (second = lintResume(typed)))).toBe(1);
    expect(second.byBullet[edited]?.map((issue) => issue.id)).toContain("duty");
    for (const id of ids.filter((other) => other !== edited)) {
      expect(second.byBullet[id]).toEqual(first.byBullet[id]);
    }
  });

  it("gives the same answers as a fresh lint, duplicates included", () => {
    const { resume, ids } = resumeOf(6);
    const copy = setBulletText(resume, ids[1]!, resume.experience[0]!.bullets[0]!.text);
    lintResume(copy);
    const cached = lintResume(copy);
    vi.unstubAllGlobals();
    expect(cached).toEqual(lintResume(copy));
    expect(cached.byBullet[ids[0]!]?.map((issue) => issue.id)).toContain("duplicate");
  });

  it("checks the summary from the same results", () => {
    const summary = `I am a results-driven team player ${run}`;
    expect(tokenizedBy(() => lintSummary(summary))).toBe(1);
    expect(tokenizedBy(() => lintSummary(summary))).toBe(0);
    expect(lintSummary(summary).map((issue) => issue.id)).toEqual(
      expect.arrayContaining(["first-person"]),
    );
  });
});

describe("lintResume on the server", () => {
  it("keeps nothing between calls", () => {
    const { resume } = resumeOf(3);
    lintResume(resume);
    expect(tokenizedBy(() => lintResume(resume))).toBe(3);
  });
});
