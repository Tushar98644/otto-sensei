import { describe, expect, it } from "vitest";
import { TEXT_LIMITS } from "@/config/plans";
import type { FixResult } from "@/lib/ai/types";
import { findBullet, type BulletRef } from "@/lib/resume/ops";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import {
  applyFixes,
  canAccept,
  countItems,
  lineGood,
  planFixAll,
  readyPatch,
  stopWaiting,
  TOO_LONG_MESSAGE,
  type FixAllItem,
} from "./fix-all";

function ref(bulletId: string, text: string): BulletRef {
  return {
    bulletId,
    text,
    section: "experience",
    parentId: "job",
    parentLabel: "Engineer at Acme",
    roleTitle: "Engineer",
    company: "Acme",
  };
}

const result = (suggestion: string, questions: string[] = []): FixResult => ({
  issues: ["Say what changed."],
  questions,
  suggestion,
  needsAnswers: questions.length > 0,
});

function ready(text: string, suggestion: string, patch: Partial<FixAllItem> = {}): FixAllItem {
  const [item] = planFixAll([ref(patch.bulletId ?? "a", text)], null).items;
  if (!item) throw new Error("no item");
  return { ...item, ...readyPatch(result(suggestion)), ...patch };
}

function resume(): Resume {
  return {
    ...emptyResume(0),
    experience: [
      {
        id: "job",
        title: "Engineer",
        company: "Acme",
        location: "",
        startDate: "Jan 2022",
        endDate: "",
        bullets: [
          { id: "a", text: "Worked on billing" },
          { id: "b", text: "Responsible for support" },
          { id: "c", text: "Helped with hiring" },
        ],
      },
    ],
  };
}

describe("planFixAll", () => {
  it("queues every line when the allowance is unknown", () => {
    const { items, capped } = planFixAll(
      [ref("a", " Worked on billing "), ref("b", "Ran QA")],
      null,
    );
    expect(items.map((item) => [item.bulletId, item.status, item.text])).toEqual([
      ["a", "waiting", "Worked on billing"],
      ["b", "waiting", "Ran QA"],
    ]);
    expect(items[0]).toMatchObject({
      place: "Engineer at Acme",
      role: { title: "Engineer", company: "Acme" },
      decision: "open",
    });
    expect(capped).toBe(0);
  });

  it("takes no more lines than the fixes left and counts the rest", () => {
    const lines = [ref("a", "One"), ref("b", "Two"), ref("c", "Three")];
    const { items, capped } = planFixAll(lines, 2);
    expect(items.map((item) => item.bulletId)).toEqual(["a", "b"]);
    expect(capped).toBe(1);
    expect(planFixAll(lines, 0)).toEqual({ items: [], capped: 3 });
  });

  it("lists a line too long for Otto without spending a fix on it", () => {
    const long = "x".repeat(TEXT_LIMITS.bulletChars + 1);
    const { items, capped } = planFixAll([ref("a", long), ref("b", "Two")], 1);
    expect(items.map((item) => [item.bulletId, item.status])).toEqual([
      ["a", "too-long"],
      ["b", "waiting"],
    ]);
    expect(items[0]?.message).toBe(TOO_LONG_MESSAGE);
    expect(capped).toBe(0);
  });
});

describe("canAccept", () => {
  it("accepts a finished, changed line with no blanks", () => {
    expect(canAccept(ready("Worked on billing", "Cut billing errors 30% by adding checks"))).toBe(
      true,
    );
  });

  it("holds back lines Otto left as they were, lines with blanks and lines already decided", () => {
    expect(canAccept(ready("Worked on billing", "Worked on billing"))).toBe(false);
    expect(canAccept(ready("Worked on billing", "Cut billing errors [X]% with checks"))).toBe(
      false,
    );
    expect(canAccept(ready("Worked on billing", "Cut errors 30%", { decision: "rejected" }))).toBe(
      false,
    );
    expect(canAccept(ready("Worked on billing", "Cut errors 30%", { refining: true }))).toBe(false);
    expect(canAccept({ ...ready("Worked on billing", "Cut errors 30%"), status: "working" })).toBe(
      false,
    );
  });

  it("uses the person's edit over Otto's suggestion", () => {
    expect(
      canAccept(ready("Worked on billing", "Cut errors [X]%", { draft: "Cut errors 30%" })),
    ).toBe(true);
    expect(canAccept(ready("Worked on billing", "Cut errors 30%", { draft: "  " }))).toBe(false);
  });

  it("knows when Otto found nothing to change", () => {
    const same = ready("Cut errors 30%", "Cut errors 30%");
    expect(lineGood({ ...same, result: { ...result("Cut errors 30%"), issues: [] } })).toBe(true);
  });
});

describe("applyFixes", () => {
  it("writes every acceptable line in one go and skips the rest", () => {
    const items = [
      ready("Worked on billing", "Cut billing errors 30% with new checks", { bulletId: "a" }),
      ready("Responsible for support", "Answered [X] tickets a week", { bulletId: "b" }),
      ready("Helped with hiring", "Hired 4 engineers in 6 months", {
        bulletId: "c",
        draft: "Hired 5 engineers in 6 months",
      }),
    ];
    const { resume: next, applied } = applyFixes(resume(), items);
    expect(applied).toEqual(["a", "c"]);
    expect(findBullet(next, "a")?.text).toBe("Cut billing errors 30% with new checks");
    expect(findBullet(next, "b")?.text).toBe("Responsible for support");
    expect(findBullet(next, "c")?.text).toBe("Hired 5 engineers in 6 months");
  });

  it("keeps a line the person changed after Otto read it", () => {
    const before = resume();
    const edited: Resume = {
      ...before,
      experience: before.experience.map((job) => ({
        ...job,
        bullets: job.bullets.map((b) => (b.id === "a" ? { ...b, text: "Rebuilt billing" } : b)),
      })),
    };
    const items = [ready("Worked on billing", "Cut billing errors 30%", { bulletId: "a" })];
    const { resume: next, applied } = applyFixes(edited, items);
    expect(applied).toEqual([]);
    expect(next).toBe(edited);
  });
});

describe("stopWaiting and countItems", () => {
  it("stops the lines still in the queue and keeps what Otto finished", () => {
    const items: FixAllItem[] = [
      ready("Worked on billing", "Cut billing errors 30%", { bulletId: "a" }),
      { ...ready("Responsible for support", "x", { bulletId: "b" }), status: "working" },
      { ...ready("Helped with hiring", "x", { bulletId: "c" }), status: "waiting" },
    ];
    expect(stopWaiting(items, new Set()).map((item) => item.status)).toEqual([
      "ready",
      "working",
      "stopped",
    ]);
    expect(stopWaiting(items, new Set(["b"])).map((item) => item.status)).toEqual([
      "ready",
      "stopped",
      "stopped",
    ]);
  });

  it("counts what is done, what can be accepted and what needs a fact", () => {
    const asking: FixAllItem = {
      ...ready("Helped with hiring", "Hired [X] engineers", { bulletId: "c" }),
      ...readyPatch(result("Hired [X] engineers", ["How many people did you hire?"])),
    };
    const items: FixAllItem[] = [
      ready("Worked on billing", "Cut billing errors 30%", { bulletId: "a" }),
      { ...ready("Responsible for support", "x", { bulletId: "b" }), status: "working" },
      asking,
      { ...ready("Ran QA", "x", { bulletId: "d" }), status: "stopped" },
      { ...ready("y".repeat(700), "x", { bulletId: "e" }), status: "too-long" },
    ];
    expect(countItems(items)).toEqual({
      total: 5,
      running: 1,
      finished: 4,
      acceptable: 1,
      questions: 1,
      stopped: 1,
      taken: 4,
    });
  });
});
