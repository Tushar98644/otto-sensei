import { describe, expect, it } from "vitest";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import type { InterviewPrep } from "./prep";
import { countBlanks, prepJobSource, prepResume, prepToText, splitBlanks } from "./prep-view";
import { savedJobText, savedRequirements } from "./saved-job";

const POST = "We're hiring a data engineer to build pipelines in Airflow and dbt. ".repeat(3);

function tailored(id: string, extra: Record<string, unknown> = {}, updatedAt = 1): Resume {
  return {
    ...emptyResume(updatedAt),
    id,
    source: "tailored",
    tailor: { baseResumeId: "base", jobTitle: "Data Engineer", company: "Mapline", keywords: [], createdAt: 1, ...extra },
    updatedAt,
  };
}

const PREP: InterviewPrep = {
  version: 1,
  job: { title: "Data Engineer", company: "Mapline" },
  questions: [{ question: "How do you test a pipeline?", why: "The post asks for dbt." }],
  stories: [
    {
      title: "Billing rebuild",
      line: "Rebuilt billing in Go",
      place: "Engineer at Acme",
      situation: "[What was going on?]",
      task: "[What were you asked to do?]",
      action: "Rebuilt billing in Go",
      result: "Cut latency by [number]",
    },
  ],
  asks: ["What does the team ship next?"],
  createdAt: 1,
  demo: false,
};

describe("prepJobSource", () => {
  it("uses the post saved with the copy first", () => {
    expect(prepJobSource({ jobUrl: "https://x.example/j" }, tailored("a", { jobText: POST }))).toEqual({
      kind: "saved",
      text: POST.trim(),
    });
  });

  it("falls back to the link, then to pasting", () => {
    expect(prepJobSource({ jobUrl: "https://x.example/j" }, tailored("a"))).toEqual({
      kind: "link",
      url: "https://x.example/j",
    });
    expect(prepJobSource({ jobUrl: "" }, tailored("a", { jobUrl: "https://y.example/k" }))).toEqual({
      kind: "link",
      url: "https://y.example/k",
    });
    expect(prepJobSource({ jobUrl: "" }, null)).toEqual({ kind: "paste" });
  });

  it("ignores saved text too short to be a post", () => {
    expect(savedJobText(tailored("a", { jobText: "Apply now" }))).toBe("");
    expect(savedJobText(tailored("a", { jobText: 42 }))).toBe("");
  });
});

describe("savedRequirements", () => {
  it("keeps the entries that parse and reads a bad list as none", () => {
    const good = { text: "Airflow", importance: "must", terms: ["Airflow"] };
    expect(savedRequirements(tailored("a", { requirements: [good, "junk"] }))).toEqual([good]);
    expect(savedRequirements(tailored("a", { requirements: "junk" }))).toBeNull();
  });
});

describe("prepResume", () => {
  it("prefers the version sent, then the newest base resume", () => {
    const base = { ...emptyResume(5), id: "base" };
    const copy = tailored("copy", {}, 9);
    expect(prepResume({ resumeId: "copy" }, [base, copy])?.id).toBe("copy");
    expect(prepResume({ resumeId: "gone" }, [base, copy])?.id).toBe("base");
    expect(prepResume({ resumeId: null }, [copy])?.id).toBe("copy");
    expect(prepResume({ resumeId: null }, [])).toBeNull();
  });
});

describe("pack text", () => {
  it("marks blanks and counts the parts that still have one", () => {
    expect(splitBlanks("Cut latency by [number] for [who]")).toEqual([
      { text: "Cut latency by ", blank: false },
      { text: "[number]", blank: true },
      { text: " for ", blank: false },
      { text: "[who]", blank: true },
    ]);
    expect(countBlanks(PREP)).toBe(3);
  });

  it("writes the whole pack as plain text", () => {
    const text = prepToText(PREP, { company: "Mapline", role: "" });
    expect(text.split("\n")[0]).toBe("Interview prep: Data Engineer at Mapline");
    expect(text).toContain("1. How do you test a pipeline?\n   Why: The post asks for dbt.");
    expect(text).toContain('  From: "Rebuilt billing in Go" (Engineer at Acme)');
    expect(text.endsWith("- What does the team ship next?")).toBe(true);
  });
});
