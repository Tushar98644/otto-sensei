import { describe, expect, it } from "vitest";
import type { SavedResult, TailorDraft } from "@/components/studio/tailor/session";
import type { TailorResult } from "@/lib/ai/types";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import { EN, FORMAT_EN } from "../messages-testing";
import { homeGreeting } from "./greeting";
import { sourceNote } from "./stats";
import { tailorSource, unfinishedTailor } from "./tailor-draft";

describe("homeGreeting", () => {
  it("says Welcome back only to someone with a resume of their own", () => {
    expect(homeGreeting({ own: 0, samples: 0 }, EN.dashboard, FORMAT_EN)).toEqual({
      title: "Welcome",
      message: "Upload your resume and I'll show you what hiring software reads.",
    });
    expect(homeGreeting({ own: 2, samples: 1 }, EN.dashboard, FORMAT_EN)).toMatchObject({
      title: "Welcome back",
      meta: "2 resumes",
    });
  });

  it("points a sample-only account at its own file", () => {
    expect(homeGreeting({ own: 0, samples: 1 }, EN.dashboard, FORMAT_EN)).toEqual({
      title: "Welcome",
      message: "That's the sample. Now drop in yours.",
      meta: "1 sample",
    });
  });
});

describe("sourceNote", () => {
  it("leaves samples out and never reads as a broken plural", () => {
    expect(
      sourceNote(["import", "sample", "sample", "scratch", "import"], EN.dashboard, FORMAT_EN),
    ).toBe("2 uploaded · 1 from scratch");
    expect(sourceNote(["sample"], EN.dashboard, FORMAT_EN)).toBe("None yet");
    expect(sourceNote([], EN.dashboard, FORMAT_EN)).toBe("None yet");
  });
});

const base = (id: string, extra: Partial<Resume> = {}): Resume => ({
  ...emptyResume(0),
  id,
  source: "import",
  ...extra,
});

const copyOf = (id: string, baseResumeId: string) =>
  base(id, {
    source: "tailored",
    tailor: { baseResumeId, jobTitle: "Engineer", company: "Acme", keywords: [], createdAt: 0 },
  });

const draft = (patch: Partial<TailorDraft> = {}): TailorDraft => ({
  title: "",
  company: "",
  text: "",
  ...patch,
});

const result = (
  sourceId: string,
  job: TailorDraft,
  extra: Partial<SavedResult> = {},
): SavedResult => ({
  id: "run",
  sourceId,
  job,
  result: { job: { title: "Engineer", company: "Read Co" } } as TailorResult,
  ...extra,
});

describe("the unfinished tailor row", () => {
  const mine = base("mine");

  it("works from the open resume's original, like the tailor step", () => {
    const copy = copyOf("copy", "mine");
    expect(tailorSource([mine, copy], "copy")).toBe(mine);
    expect(tailorSource([mine], "mine")).toBe(mine);
    expect(tailorSource([mine], null)).toBeNull();
    expect(tailorSource([copyOf("orphan", "gone")], "orphan")?.id).toBe("orphan");
  });

  it("offers to continue a pasted post that hasn't run yet", () => {
    expect(
      unfinishedTailor({
        source: mine,
        draft: draft({ text: "Post", company: " Acme " }),
        last: null,
      }),
    ).toEqual({ resumeId: "mine", company: "Acme", ran: false });
    expect(unfinishedTailor({ source: mine, draft: draft(), last: null })).toBeNull();
  });

  it("offers to continue results that haven't become a copy, and stops once one is made", () => {
    const job = draft({ text: "Post" });
    expect(unfinishedTailor({ source: mine, draft: job, last: result("mine", job) })).toEqual({
      resumeId: "mine",
      company: "Read Co",
      ran: true,
    });
    expect(
      unfinishedTailor({ source: mine, draft: job, last: result("mine", job, { copyId: "copy" }) }),
    ).toBeNull();
  });

  it("treats a new post pasted after a finished run as unfinished", () => {
    const old = draft({ text: "Old post", company: "Old" });
    expect(
      unfinishedTailor({
        source: mine,
        draft: draft({ text: "New post", company: "New" }),
        last: result("mine", old, { copyId: "copy" }),
      }),
    ).toEqual({ resumeId: "mine", company: "New", ran: false });
  });
});
