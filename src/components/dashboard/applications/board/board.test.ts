import { describe, expect, it } from "vitest";
import type { Application } from "@/lib/applications/schema";
import type { SavedJob } from "@/lib/job-feed/types";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import {
  boardColumns,
  canDrop,
  cardName,
  columnOf,
  createBody,
  daysInStage,
  initials,
  isOverdue,
  menuStatuses,
  needsAction,
  onward,
  planDrop,
  planStatus,
  readView,
  stepColumn,
  toApplyItems,
  writeView,
  type BoardCard,
} from "./board";

const DAY = 24 * 60 * 60 * 1_000;

const JOB_A = "6f9619ff-8b86-4d01-b42d-00c04fc964ff";
const JOB_B = "7f9619ff-8b86-4d01-b42d-00c04fc964ff";

function app(id: string, overrides: Partial<Application> = {}): Application {
  return {
    id,
    resumeId: null,
    resumeTitle: "",
    company: `Company ${id}`,
    role: "",
    jobUrl: "",
    appliedAt: 1_000,
    status: "applied",
    stageReached: "applied",
    statusChangedAt: 1_000,
    notes: "",
    followUpAt: null,
    jobId: null,
    hasPrep: false,
    interviewAt: null,
    createdAt: 1_000,
    updatedAt: 1_000,
    ...overrides,
  };
}

function saved(id: string, overrides: Partial<SavedJob> = {}): SavedJob {
  return {
    id,
    source: "greenhouse",
    company: "Acme",
    title: "Backend Engineer",
    location: "Berlin",
    remote: false,
    employmentType: null,
    seniority: "mid",
    postedAt: 1,
    url: `https://boards.example.com/acme/${id}`,
    keywords: [],
    closed: false,
    savedAt: 5_000,
    ...overrides,
  };
}

function copy(id: string, tailor: Partial<NonNullable<Resume["tailor"]>> = {}): Resume {
  return {
    ...emptyResume(),
    id,
    title: `Copy ${id}`,
    source: "tailored",
    tailor: {
      baseResumeId: "base",
      jobTitle: "Designer",
      company: "Globex",
      keywords: [],
      createdAt: 3_000,
      ...tailor,
    },
  };
}

const base: Resume = { ...emptyResume(), id: "base", title: "Ada Lovelace" };

describe("the To apply column", () => {
  it("lists saved jobs and copies with no application yet, newest first", () => {
    const items = toApplyItems(
      [saved(JOB_A, { savedAt: 5_000 }), saved(JOB_B, { savedAt: 1_000 })],
      [base, copy("c1", { createdAt: 3_000 })],
      [],
    );
    expect(items.map((item) => item.key)).toEqual([`job:${JOB_A}`, "copy:c1", `job:${JOB_B}`]);
    expect(items[1]).toMatchObject({ company: "Globex", role: "Designer", job: null, jobId: null });
  });

  it("shows a saved job and the copy made for it as one card", () => {
    const forA = copy("c-a", { jobId: JOB_A });
    const byLink = copy("c-b", { jobUrl: `https://boards.example.com/acme/${JOB_B}` });
    const items = toApplyItems([saved(JOB_A), saved(JOB_B)], [forA, byLink], []);
    expect(items).toHaveLength(2);
    expect(items.map((item) => [item.key, item.copy?.id])).toEqual([
      [`job:${JOB_A}`, "c-a"],
      [`job:${JOB_B}`, "c-b"],
    ]);
  });

  it("leaves out jobs and copies already applied to, by id or by link", () => {
    const sentCopy = copy("sent");
    const items = toApplyItems(
      [saved(JOB_A), saved(JOB_B), saved("c3", { url: "https://acme.example.com/apply/3" })],
      [sentCopy, copy("c-for-b", { jobId: JOB_B })],
      [
        app("1", { jobId: JOB_A }),
        app("2", { resumeId: "c-for-b" }),
        app("3", { jobUrl: "acme.example.com/apply/3" }),
        app("4", { resumeId: "sent" }),
      ],
    );
    expect(items).toEqual([]);
  });
});

describe("the board's columns", () => {
  it("puts each application under its status, Rejected and No reply together", () => {
    const columns = boardColumns(
      [
        app("old", { statusChangedAt: 1 }),
        app("new", { statusChangedAt: 9 }),
        app("r", { status: "rejected", stageReached: "interview" }),
        app("n", { status: "no_reply" }),
        app("i", { status: "interview", resumeId: "c1" }),
      ],
      toApplyItems([saved(JOB_A)], [], []),
      [copy("c1")],
      0,
    );
    expect(columns.applied.map((card) => card.key)).toEqual(["application:new", "application:old"]);
    expect(columns.closed.map((card) => card.key).sort()).toEqual(["application:n", "application:r"]);
    expect(columns.to_apply).toHaveLength(1);
    const interview = columns.interview[0];
    expect(interview?.kind === "application" && interview.copy?.id).toBe("c1");
    expect(columnOf("no_reply")).toBe("closed");
    expect(columnOf("offer")).toBe("offer");
  });

  it("puts a due follow-up first and marks two quiet weeks as overdue", () => {
    const now = 100 * DAY;
    const due = app("due", { statusChangedAt: 10 * DAY, followUpAt: 90 * DAY });
    const fresh = app("fresh", { statusChangedAt: 99 * DAY, followUpAt: 105 * DAY });
    const quiet = app("quiet", { statusChangedAt: 80 * DAY });
    const talking = app("talking", { status: "interview", statusChangedAt: 50 * DAY });
    const offer = app("offer", { status: "offer", statusChangedAt: 1 });
    const columns = boardColumns([due, fresh, quiet, talking, offer], [], [], now);
    expect(columns.applied.map((card) => card.key)).toEqual([
      "application:due",
      "application:fresh",
      "application:quiet",
    ]);
    const [first, second, quietCard] = columns.applied;
    expect(first && needsAction(first, now)).toBe(true);
    expect(second && needsAction(second, now)).toBe(false);
    expect(first && isOverdue(first, now)).toBe(true);
    expect(second && isOverdue(second, now)).toBe(false);
    expect(quietCard && daysInStage(quietCard, now)).toBe(20);
    expect(quietCard && isOverdue(quietCard, now)).toBe(true);
    // Interviewing and offers never go stale, however long they sit.
    const [talkingCard] = columns.interview;
    const [offerCard] = columns.offer;
    expect(talkingCard && daysInStage(talkingCard, now)).toBe(50);
    expect(talkingCard && isOverdue(talkingCard, now)).toBe(false);
    expect(offerCard && isOverdue(offerCard, now)).toBe(false);
    // Before the clock is known, nothing is due.
    expect(first && needsAction(first, 0)).toBe(false);
  });
});

describe("moving a card", () => {
  const applied: BoardCard = { kind: "application", key: "a", application: app("a"), copy: null };
  const waiting: BoardCard = {
    kind: "to_apply",
    key: "job",
    item: toApplyItems([saved(JOB_A)], [], [])[0]!,
  };

  it("moves an application on, asks at Interviewing and Closed, and never back to To apply", () => {
    expect(planDrop(applied, "offer")).toEqual({
      kind: "status",
      application: applied.application,
      status: "offer",
    });
    expect(planDrop(applied, "interview")).toEqual({ kind: "ask", card: applied, column: "interview" });
    expect(planDrop(applied, "closed")).toEqual({ kind: "ask", card: applied, column: "closed" });
    expect(planDrop(applied, "applied")).toEqual({ kind: "none" });
    expect(planDrop(applied, "to_apply")).toEqual({ kind: "none" });
    expect(planDrop(applied, "delete")).toEqual({ kind: "delete", application: applied.application });
    expect(canDrop(applied, "to_apply")).toBe(false);
    expect(onward(applied)).toBe("interview");
    expect(menuStatuses(applied)).toEqual(["interview", "offer", "rejected", "no_reply"]);
  });

  it("turns a To apply card into an application where it's dropped", () => {
    const item = waiting.kind === "to_apply" ? waiting.item : null;
    expect(planDrop(waiting, "applied")).toEqual({ kind: "create", item, status: "applied" });
    expect(planDrop(waiting, "interview")).toEqual({ kind: "ask", card: waiting, column: "interview" });
    expect(planStatus(waiting, "no_reply")).toEqual({ kind: "create", item, status: "no_reply" });
    expect(planDrop(waiting, "to_apply")).toEqual({ kind: "none" });
    // Only an application can be deleted from the board.
    expect(canDrop(waiting, "delete")).toBe(false);
    expect(onward(waiting)).toBe("applied");
    expect(menuStatuses(waiting)).toHaveLength(5);
  });

  it("stops moving on at Offer and Closed, and a status it has is no move", () => {
    const offer: BoardCard = { ...applied, application: app("o", { status: "offer" }) };
    const closed: BoardCard = { ...applied, application: app("c", { status: "rejected" }) };
    expect(onward(offer)).toBeNull();
    expect(onward(closed)).toBeNull();
    expect(planStatus(closed, "rejected")).toEqual({ kind: "none" });
    expect(planStatus(closed, "no_reply")).toMatchObject({ kind: "status", status: "no_reply" });
    // Rejected to No reply is a change, but dropping on its own column isn't.
    expect(planDrop(closed, "closed")).toEqual({ kind: "none" });
  });

  it("sends the copy made for the job, else the resume Jobs matches with", () => {
    const withCopy = toApplyItems([saved(JOB_A)], [copy("c-a", { jobId: JOB_A })], [])[0]!;
    expect(createBody(withCopy, "applied", 7_000, base)).toEqual({
      resumeId: "c-a",
      resumeTitle: "Copy c-a",
      jobId: JOB_A,
      company: "Acme",
      role: "Backend Engineer",
      jobUrl: `https://boards.example.com/acme/${JOB_A}`,
      appliedAt: 7_000,
      status: "applied",
    });
    const plain = toApplyItems([saved(JOB_B)], [], [])[0]!;
    expect(createBody(plain, "interview", 7_000, base, 9_000)).toMatchObject({
      resumeId: "base",
      resumeTitle: "Ada Lovelace",
      status: "interview",
      interviewAt: 9_000,
    });
    expect(createBody(plain, "applied", 7_000, null)).toMatchObject({ resumeId: null, resumeTitle: "" });
    // A copy that doesn't name its company: the form asks for it.
    const nameless = toApplyItems([], [copy("c", { company: " " })], [])[0]!;
    expect(createBody(nameless, "applied", 7_000, base)).toBeNull();
  });

  it("steps through the columns it may go to by keyboard, stopping at the ends", () => {
    expect(stepColumn(applied, "applied", 1)).toBe("interview");
    // To apply is skipped for an application, so Applied is the left end.
    expect(stepColumn(applied, "applied", -1)).toBe("applied");
    expect(stepColumn(applied, "closed", 1)).toBe("closed");
    expect(stepColumn(applied, "offer", 1)).toBe("closed");
    expect(stepColumn(waiting, "to_apply", 1)).toBe("applied");
    expect(stepColumn(waiting, "to_apply", -1)).toBe("to_apply");
  });

  it("names the card and draws its initials", () => {
    expect(cardName(applied)).toBe("Company a");
    expect(cardName({ ...applied, application: app("x", { company: "", role: "Chef" }) })).toBe("Chef");
    expect(cardName(waiting)).toBe("Acme");
    expect(initials("Northwind Traders")).toBe("NT");
    expect(initials("acme")).toBe("AC");
    expect(initials("  ")).toBe("?");
    expect(initials("Café (Berlin)")).toBe("CB");
  });
});

describe("the remembered view", () => {
  it("is Board until List is picked, and survives blocked storage", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    };
    expect(readView(storage)).toBe("board");
    writeView(storage, "list");
    expect(readView(storage)).toBe("list");
    const blocked = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(readView(blocked)).toBe("board");
    expect(() => writeView(blocked, "list")).not.toThrow();
    expect(readView(null)).toBe("board");
  });
});
