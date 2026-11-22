import { describe, expect, it } from "vitest";
import { DAY_MS } from "@/lib/time";
import type { ApplicationStage, ApplicationStatus } from "./status";
import {
  compare,
  findingOf,
  findingText,
  heardBack,
  isCounted,
  letteredApplications,
  MIN_GROUP,
  notEnoughLine,
  resumeKinds,
  suggestionCopy,
  waitingLine,
  whatsWorking,
  type ResumeKind,
  type WorkingApplication,
  type WorkingInput,
} from "./working";

const NOW = Date.UTC(2026, 10, 22, 12);
let next = 0;

function app(
  status: ApplicationStatus,
  {
    resumeId = "general",
    daysAgo = 14,
    stageReached,
  }: { resumeId?: string | null; daysAgo?: number; stageReached?: ApplicationStage } = {},
): WorkingApplication {
  next += 1;
  return {
    id: `app-${next}`,
    status,
    stageReached:
      stageReached ?? (status === "interview" || status === "offer" ? status : "applied"),
    appliedAt: NOW - daysAgo * DAY_MS,
    resumeId,
  };
}

function many(count: number, status: ApplicationStatus, resumeId: string) {
  return Array.from({ length: count }, () => app(status, { resumeId }));
}

const KINDS = new Map<string, ResumeKind>([
  ["tailored", "tailored"],
  ["tailored-2", "tailored"],
  ["general", "general"],
]);

function input(applications: WorkingApplication[], extra: Partial<WorkingInput> = {}) {
  return { applications, kinds: KINDS, lettered: null, now: NOW, ...extra };
}

describe("heardBack and isCounted", () => {
  it("counts any stage past Applied as hearing back, a no included", () => {
    expect(heardBack(app("applied"))).toBe(false);
    expect(heardBack(app("no_reply"))).toBe(false);
    expect(heardBack(app("interview"))).toBe(true);
    expect(heardBack(app("offer"))).toBe(true);
    expect(heardBack(app("rejected"))).toBe(true);
    expect(heardBack(app("rejected", { stageReached: "interview" }))).toBe(true);
  });

  it("waits a week before counting an application that hasn't heard back", () => {
    expect(isCounted(app("applied", { daysAgo: 3 }), NOW)).toBe(false);
    expect(isCounted(app("applied", { daysAgo: 6.9 }), NOW)).toBe(false);
    expect(isCounted(app("applied", { daysAgo: 7 }), NOW)).toBe(true);
    expect(isCounted(app("interview", { daysAgo: 1 }), NOW)).toBe(true);
    expect(isCounted(app("rejected", { daysAgo: 0 }), NOW)).toBe(true);
    // Marked No reply: the person stopped waiting, so it counts at once.
    expect(isCounted(app("no_reply", { daysAgo: 2 }), NOW)).toBe(true);
  });
});

describe("whatsWorking", () => {
  it("is empty and asks for the first application when nothing is logged", () => {
    const working = whatsWorking(input([]));
    expect(working).toMatchObject({ total: 0, counted: 0, waiting: 0, letter: null });
    expect(working.resume.ready).toBe(false);
    expect(working.resume.leader).toBeNull();
    expect(working.suggestion).toBe("log");
  });

  it("compares tailored versions with the general resume once each side has enough", () => {
    const working = whatsWorking(
      input([
        ...many(4, "interview", "tailored"),
        ...many(8, "applied", "tailored-2"),
        ...many(9, "applied", "general"),
      ]),
    );
    expect(working.resume.with).toEqual({ sent: 12, counted: 12, replies: 4, interviews: 4 });
    expect(working.resume.without).toEqual({ sent: 9, counted: 9, replies: 0, interviews: 0 });
    expect(working.resume).toMatchObject({ ready: true, measure: "interviews", leader: "with" });
    expect(findingText(findingOf(working.resume))).toBe(
      "Your tailored versions got interviews 4 of 12 times. Your general resume: 0 of 9.",
    );
    expect(working.suggestion).toBe("tailor");
    expect(suggestionCopy(working)).toEqual({
      text: "Tailor the next one too: it works for you.",
      action: "Tailor a resume",
    });
  });

  it("splits the sentence so the leading number can be marked", () => {
    const working = whatsWorking(
      input([...many(5, "interview", "tailored"), ...many(5, "applied", "general")]),
    );
    expect(findingOf(working.resume)).toEqual({
      lead: "Your tailored versions got interviews ",
      mark: "5 of 5",
      tail: " times.",
      rest: "Your general resume: 0 of 5.",
    });
  });

  it("talks about hearing back when nobody has had an interview yet", () => {
    const working = whatsWorking(
      input([
        ...many(2, "rejected", "tailored"),
        ...many(4, "applied", "tailored"),
        ...many(1, "rejected", "general"),
        ...many(5, "no_reply", "general"),
      ]),
    );
    expect(working.resume).toMatchObject({ ready: true, measure: "replies", leader: "with" });
    expect(findingText(findingOf(working.resume))).toBe(
      "Your tailored versions heard back 2 of 6 times. Your general resume: 1 of 6.",
    );
  });

  it("says when the general resume does as well, and suggests applying instead", () => {
    const working = whatsWorking(
      input([
        ...many(1, "interview", "tailored"),
        ...many(5, "applied", "tailored"),
        ...many(3, "interview", "general"),
        ...many(5, "applied", "general"),
      ]),
    );
    expect(working.resume.leader).toBe("without");
    expect(working.suggestion).toBe("apply");
    expect(suggestionCopy(working).text).toBe(
      "Your general resume does better so far. Save tailoring for the jobs you want most.",
    );
  });

  it("calls close rates the same", () => {
    const working = whatsWorking(
      input([
        ...many(2, "interview", "tailored"),
        ...many(8, "applied", "tailored"),
        ...many(2, "interview", "general"),
        ...many(9, "applied", "general"),
      ]),
    );
    expect(working.resume.leader).toBe("same");
    expect(suggestionCopy(working).text).toContain("Both do about as well so far");
  });

  it("says there isn't enough yet below five on a side, and never gives a rate", () => {
    const working = whatsWorking(
      input([...many(3, "interview", "tailored"), ...many(9, "applied", "general")]),
    );
    expect(working.resume.ready).toBe(false);
    expect(working.resume.leader).toBeNull();
    const line = notEnoughLine(working.resume);
    expect(line).toBe(
      `Counted so far: 3 tailored versions and 9 general resumes. Otto compares from ${MIN_GROUP} of each.`,
    );
    expect(line).not.toMatch(/%/);
    expect(working.suggestion).toBe("tailor");
    expect(suggestionCopy(working)).toEqual({
      text: "Send a tailored version to your next few jobs, so there's something to compare.",
      action: "Tailor a resume",
    });
  });

  it("asks for more logging when only the general resume is short", () => {
    const working = whatsWorking(
      input([...many(6, "applied", "tailored"), ...many(2, "applied", "general")]),
    );
    expect(working.suggestion).toBe("log");
  });

  it("leaves young applications out until they hear back or turn a week old", () => {
    const working = whatsWorking(
      input([
        ...many(5, "applied", "tailored"),
        app("applied", { resumeId: "general", daysAgo: 2 }),
        app("applied", { resumeId: "general", daysAgo: 5 }),
        app("interview", { resumeId: "general", daysAgo: 1 }),
      ]),
    );
    expect(working).toMatchObject({ total: 8, counted: 6, waiting: 2 });
    expect(working.resume.without).toEqual({ sent: 3, counted: 1, replies: 1, interviews: 1 });
    expect(waitingLine(working.waiting)).toBe(
      "2 applications from the past 7 days aren't counted yet: replies take time.",
    );
    expect(waitingLine(1)).toBe(
      "1 application from the past 7 days isn't counted yet: replies take time.",
    );
    expect(waitingLine(0)).toBeNull();
  });

  it("asks for patience when nothing can be counted yet", () => {
    const working = whatsWorking(
      input([app("applied", { daysAgo: 1 }), app("applied", { daysAgo: 2 })]),
    );
    expect(working.suggestion).toBe("wait");
    expect(suggestionCopy(working).action).toBeNull();
  });

  it("keeps applications without a known resume out of the resume comparison only", () => {
    const working = whatsWorking(
      input([
        app("interview", { resumeId: null }),
        app("applied", { resumeId: "deleted-resume" }),
        ...many(2, "applied", "general"),
      ]),
    );
    expect(working.total).toBe(4);
    expect(working.resume.with.sent).toBe(0);
    expect(working.resume.without.sent).toBe(2);
  });

  it("compares cover letters when some applications had one", () => {
    const withLetter = [...many(3, "interview", "general"), ...many(5, "applied", "general")];
    const without = [...many(1, "interview", "tailored"), ...many(9, "applied", "tailored")];
    const working = whatsWorking(
      input([...withLetter, ...without], {
        lettered: new Set(withLetter.map((item) => item.id)),
      }),
    );
    expect(working.letter).toMatchObject({ ready: true, measure: "interviews", leader: "with" });
    expect(findingText(findingOf(working.letter!))).toBe(
      "With a cover letter, 3 of 8 got an interview. Without one: 1 of 10.",
    );
    expect(working.suggestion).toBe("letter");
    expect(suggestionCopy(working).text).toBe(
      "Write a letter for the next one: yours get more interviews.",
    );
  });

  it("puts tailoring first when both comparisons favour the extra work", () => {
    const tailoredWithLetters = many(5, "interview", "tailored");
    const working = whatsWorking(
      input([...tailoredWithLetters, ...many(5, "applied", "general")], {
        lettered: new Set(tailoredWithLetters.map((item) => item.id)),
      }),
    );
    expect(working.letter?.leader).toBe("with");
    expect(working.suggestion).toBe("tailor");
  });

  it("has no letter comparison when letters are unknown or none were written", () => {
    const list = many(6, "applied", "general");
    expect(whatsWorking(input(list)).letter).toBeNull();
    expect(whatsWorking(input(list, { lettered: new Set() })).letter).toBeNull();
  });

  it("describes a letter comparison that isn't ready", () => {
    const comparison = compare(
      "letter",
      { sent: 2, counted: 2, replies: 1, interviews: 0 },
      { sent: 9, counted: 9, replies: 1, interviews: 0 },
    );
    expect(comparison.ready).toBe(false);
    expect(notEnoughLine(comparison)).toBe(
      "Cover letters: 2 counted with one, 9 without. Otto compares from 5 of each.",
    );
  });

  it("handles Free's single application honestly", () => {
    const working = whatsWorking(input([app("applied", { resumeId: "general" })]));
    expect(working.resume.ready).toBe(false);
    expect(working.suggestion).toBe("tailor");
    expect(notEnoughLine(working.resume)).toContain("0 tailored versions and 1 general resume");
  });

  it("says when no application names a resume, and asks to pick one next time", () => {
    const working = whatsWorking(input(many(6, "applied", "deleted-resume")));
    expect(notEnoughLine(working.resume)).toBe(
      "None of these say which of your resumes you sent, so there's nothing to compare yet.",
    );
    expect(working.suggestion).toBe("log");
    expect(suggestionCopy(working)).toEqual({
      text: "When you log the next one, pick the resume you sent, so Otto can compare.",
      action: "Add application",
    });
  });
});

describe("resumeKinds and letteredApplications", () => {
  it("sorts resumes into tailored and general, leaving samples out", () => {
    const tailor = { baseResumeId: "a", jobTitle: "", company: "", keywords: [], createdAt: 1 };
    const kinds = resumeKinds([
      { id: "a", source: "import", tailor: null },
      { id: "b", source: "tailored", tailor },
      { id: "c", source: "scratch", tailor: null },
      { id: "d", source: "sample", tailor: null },
    ]);
    expect(Object.fromEntries(kinds)).toEqual({ a: "general", b: "tailored", c: "general" });
  });

  it("keeps only the applications a cover letter was written for", () => {
    const ids = letteredApplications([
      { kind: "letter", applicationId: "app-1" },
      { kind: "letter", applicationId: null },
      { kind: "answer", applicationId: "app-2" },
      { kind: "outreach", applicationId: "app-3" },
      { kind: "letter", applicationId: "app-1" },
    ]);
    expect([...ids]).toEqual(["app-1"]);
  });
});
