import { describe, expect, it } from "vitest";
import type { Application } from "@/lib/applications/schema";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import { EN, FORMAT_EN } from "../messages-testing";
import type { SetupItem } from "@/lib/setup/checklist";
import {
  fixTarget,
  interviewDay,
  interviewsSoon,
  nextSteps,
  UP_NEXT_ROWS,
  type NextStepFacts,
} from "./next-steps";

const STRONG = "Cut checkout errors 38% by rewriting the payment retry logic";
const WARNING = "Responsible for managing the company website";
const TIP = "Led the redesign of the onboarding flow, which lifted activation";

const NOW = new Date(2026, 10, 21, 15).getTime();
const noon = (day: number) => new Date(2026, 10, day, 12).getTime();

function app(id: string, overrides: Partial<Application> = {}): Application {
  return {
    id,
    resumeId: null,
    resumeTitle: "",
    company: `Company ${id}`,
    role: "",
    jobUrl: "",
    appliedAt: noon(1),
    status: "applied",
    stageReached: "applied",
    jobId: null,
    hasPrep: false,
    interviewAt: null,
    interviewTime: null,
    interviewZone: null,
    statusChangedAt: noon(1),
    notes: "",
    followUpAt: null,
    createdAt: noon(1),
    updatedAt: noon(1),
    ...overrides,
  };
}

function resume(id: string, lines: string[], extra: Partial<Resume> = {}): Resume {
  return {
    ...emptyResume(0),
    id,
    title: `Resume ${id}`,
    source: "import",
    updatedAt: 1,
    experience: [
      {
        id: `${id}-job`,
        company: "Fabrikam",
        title: "Engineer",
        location: "",
        startDate: "2020",
        endDate: "Present",
        bullets: lines.map((text, line) => ({ id: `${id}-${line}`, text })),
      },
    ],
    ...extra,
  };
}

const facts = (patch: Partial<NextStepFacts> = {}): NextStepFacts => ({
  now: NOW,
  ownResumes: 1,
  applications: [],
  fix: null,
  tailor: null,
  setup: null,
  matches: null,
  ...patch,
});

const kinds = (list: ReturnType<typeof nextSteps>) =>
  list.map((step) => (step.kind === "setup" ? `setup:${step.id}` : step.kind));

const items = (...list: [SetupItem["id"], boolean][]): SetupItem[] =>
  list.map(([id, done]) => ({ id, done }));

describe("nextSteps", () => {
  it("starts a new account on the upload, then the setup rows it still needs", () => {
    const steps = nextSteps(
      facts({
        ownResumes: 0,
        setup: {
          items: items(["resume", false], ["looking_for", false], ["weak_line", false]),
          weakLine: "no_resume",
        },
      }),
    );
    expect(kinds(steps)).toEqual(["upload", "setup:looking_for"]);
  });

  it("puts dated things first, then the work in progress, then setup and matches", () => {
    const steps = nextSteps(
      facts({
        applications: [
          app("due", { followUpAt: NOW - 1 }),
          app("soon", { status: "interview", interviewAt: noon(23) }),
        ],
        fix: { resumeId: "r", bulletId: "b", title: "Mine", lines: 2, remember: false },
        tailor: { resumeId: "r", company: "Acme", ran: false },
        setup: { items: items(["resume", true], ["work", false]), weakLine: "done" },
        matches: { strong: 4, newToday: 2 },
      }),
    );
    expect(kinds(steps)).toEqual(["interview", "follow_up", "fix", "tailor"]);
    expect(steps).toHaveLength(UP_NEXT_ROWS);
  });

  it("folds an open weak line into the fix row and keeps the waiting one as setup", () => {
    const open = nextSteps(
      facts({
        fix: { resumeId: "r", bulletId: "b", title: "Mine", lines: 1, remember: true },
        setup: { items: items(["resume", true], ["weak_line", false]), weakLine: "open" },
      }),
    );
    expect(kinds(open)).toEqual(["fix"]);
    const waiting = nextSteps(
      facts({
        setup: { items: items(["resume", true], ["weak_line", false]), weakLine: "no_lines" },
      }),
    );
    expect(kinds(waiting)).toEqual(["setup:weak_line"]);
  });

  it("groups every due follow-up into one row, oldest first, and skips scheduled and closed ones", () => {
    const steps = nextSteps(
      facts({
        applications: [
          app("later", { followUpAt: NOW - 1_000 }),
          app("first", { followUpAt: NOW - 5_000 }),
          app("scheduled", { followUpAt: NOW + 5_000 }),
          app("closed", { status: "rejected", followUpAt: NOW - 9_000 }),
        ],
      }),
    );
    expect(steps).toHaveLength(1);
    const [row] = steps;
    expect(row?.kind === "follow_up" && row.due.map((item) => item.id)).toEqual(["first", "later"]);
  });

  it("counts the follow-up Otto sets after an interview", () => {
    const steps = nextSteps(
      facts({
        applications: [app("interviewed", { status: "interview", followUpAt: NOW - 1_000 })],
      }),
    );
    expect(steps[0]?.kind === "follow_up" && steps[0].due.map((item) => item.id)).toEqual([
      "interviewed",
    ]);
  });

  it("shows matches only when some are strong and some are new today", () => {
    expect(kinds(nextSteps(facts({ matches: { strong: 3, newToday: 1 } })))).toEqual(["matches"]);
    expect(nextSteps(facts({ matches: { strong: 0, newToday: 5 } }))).toEqual([]);
    expect(nextSteps(facts({ matches: { strong: 3, newToday: 0 } }))).toEqual([]);
  });

  it("has nothing to say when everything is done", () => {
    expect(
      nextSteps(
        facts({
          setup: { items: items(["resume", true], ["looking_for", true]), weakLine: "done" },
        }),
      ),
    ).toEqual([]);
  });
});

describe("interviewsSoon", () => {
  it("keeps interviews from today through the next 7 days, soonest first", () => {
    const list = [
      app("week", { status: "interview", interviewAt: noon(28) }),
      app("past", { status: "interview", interviewAt: noon(20) }),
      app("today", { status: "interview", interviewAt: noon(21) }),
      app("far", { status: "interview", interviewAt: noon(29) }),
      app("offer", { status: "offer", interviewAt: noon(22) }),
      app("undated", { status: "interview" }),
    ];
    expect(interviewsSoon(list, NOW).map((item) => item.id)).toEqual(["today", "week"]);
  });

  it("shows at most two interviews so the other rows keep their place", () => {
    const list = [22, 23, 24].map((day) =>
      app(`d${day}`, { status: "interview", interviewAt: noon(day) }),
    );
    expect(kinds(nextSteps(facts({ applications: list })))).toEqual(["interview", "interview"]);
  });
});

describe("interviewDay", () => {
  it("says today and tomorrow, then the weekday and date", () => {
    expect(interviewDay(noon(21), NOW, EN.dashboard, FORMAT_EN)).toBe("Today");
    expect(interviewDay(noon(22), NOW, EN.dashboard, FORMAT_EN)).toBe("Tomorrow");
    expect(interviewDay(noon(26), NOW, EN.dashboard, FORMAT_EN)).toBe("Thu, Nov 26");
  });
});

describe("fixTarget", () => {
  it("opens the setup's own weak line so fixing it ticks the setup row off", () => {
    const mine = resume("a", [WARNING, STRONG]);
    expect(fixTarget([mine], { resumeId: "a", bulletId: "a-0" })).toMatchObject({
      resumeId: "a",
      bulletId: "a-0",
      title: "Resume a",
      remember: true,
    });
  });

  it("otherwise picks the first original with a warning, before tailored copies", () => {
    const copy = resume("copy", [WARNING], {
      source: "tailored",
      tailor: {
        baseResumeId: "a",
        jobTitle: "Engineer",
        company: "Northwind",
        keywords: [],
        createdAt: 0,
      },
    });
    const clean = resume("a", [STRONG]);
    const weak = resume("b", [STRONG, WARNING]);
    expect(fixTarget([copy, clean, weak], null)).toMatchObject({
      resumeId: "b",
      bulletId: "b-1",
      remember: false,
    });
    expect(fixTarget([clean], null)).toBeNull();
  });

  it("counts every line the resume card counts, tips included", () => {
    const tips = resume("t", [STRONG, TIP]);
    expect(fixTarget([tips], null)).toMatchObject({ resumeId: "t", bulletId: "t-1", lines: 1 });
    const mixed = resume("m", [TIP, WARNING]);
    expect(fixTarget([mixed], null)).toMatchObject({ bulletId: "m-1", lines: 2 });
  });
});
