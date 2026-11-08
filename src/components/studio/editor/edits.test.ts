import { describe, expect, it } from "vitest";
import {
  emptyResume,
  extrasOf,
  newBullet,
  newExperience,
  newExtraItem,
  newExtraSection,
  newProject,
  type Resume,
} from "@/lib/resume/schema";
import {
  addSkills,
  bulletsOf,
  editBullets,
  insertAfter,
  isPresentDate,
  dateSpan,
  metaLine,
  moveItem,
  patchItem,
  pickNeighbor,
  planPaste,
  removeItem,
  setHidden,
  singleLine,
  splitPastedLines,
  splitSkillDraft,
  splitSkills,
} from "./edits";

const a = { id: "a", v: 1 };
const b = { id: "b", v: 2 };
const c = { id: "c", v: 3 };

describe("list edits", () => {
  it("moves an item and leaves the others untouched", () => {
    const moved = moveItem([a, b, c], "c", -1);
    expect(moved.map((item) => item.id)).toEqual(["a", "c", "b"]);
    expect(moved[0]).toBe(a);
  });

  it("returns the same array for a move past either end or an unknown id", () => {
    const items = [a, b, c];
    expect(moveItem(items, "a", -1)).toBe(items);
    expect(moveItem(items, "c", 1)).toBe(items);
    expect(moveItem(items, "zzz", 1)).toBe(items);
  });

  it("patches one item and keeps the identity of the rest", () => {
    const items = [a, b, c];
    const patched = patchItem(items, "b", (item) => ({ ...item, v: 20 }));
    expect(patched[1]).toEqual({ id: "b", v: 20 });
    expect(patched[0]).toBe(a);
    expect(patched[2]).toBe(c);
    expect(patchItem(items, "zzz", (item) => item)).toBe(items);
  });

  it("removes by id, and returns the same array when nothing matched", () => {
    const items = [a, b, c];
    expect(removeItem(items, "b")).toEqual([a, c]);
    expect(removeItem(items, "zzz")).toBe(items);
  });

  it("inserts after an id, or at the end when the id is gone", () => {
    expect(insertAfter([a, c], "a", [b]).map((item) => item.id)).toEqual(["a", "b", "c"]);
    expect(insertAfter([a, b], "zzz", [c]).map((item) => item.id)).toEqual(["a", "b", "c"]);
  });

  it("picks the neighbor that takes a removed item's place", () => {
    const ids = ["a", "b", "c"];
    expect(pickNeighbor(ids, "b", "previous")).toEqual({ id: "a", before: true });
    expect(pickNeighbor(ids, "b", "next")).toEqual({ id: "c", before: false });
    expect(pickNeighbor(ids, "a", "previous")).toEqual({ id: "b", before: false });
    expect(pickNeighbor(ids, "c", "next")).toEqual({ id: "b", before: true });
    expect(pickNeighbor(["a"], "a", "next")).toBeNull();
    expect(pickNeighbor(ids, "zzz", "next")).toBeNull();
  });
});

describe("bullet edits", () => {
  function resumeWithJobs(): { resume: Resume; jobId: string; otherId: string } {
    const job = { ...newExperience(), bullets: [newBullet("one"), newBullet("two")] };
    const other = newExperience();
    const resume = { ...emptyResume(0), experience: [job, other], projects: [newProject()] };
    return { resume, jobId: job.id, otherId: other.id };
  }

  it("edits one entry's bullets and leaves other entries and sections alone", () => {
    const { resume, jobId, otherId } = resumeWithJobs();
    const next = editBullets(resume, { section: "experience", parentId: jobId }, (bullets) =>
      bullets.slice(1),
    );
    expect(bulletsOf(next, { section: "experience", parentId: jobId })?.map((x) => x.text)).toEqual(
      ["two"],
    );
    expect(next.experience[1]).toBe(resume.experience[1]);
    expect(next.projects).toBe(resume.projects);
    expect(bulletsOf(next, { section: "experience", parentId: otherId })).toHaveLength(1);
    expect(bulletsOf(next, { section: "projects", parentId: jobId })).toBeNull();
  });

  it("edits the lines of an item in an extra section", () => {
    const role = { ...newExtraItem(), bullets: [newBullet("Ran a weekly code club")] };
    const volunteering = { ...newExtraSection("volunteering"), items: [role] };
    const awards = newExtraSection("awards");
    const resume: Resume = { ...emptyResume(0), extras: [volunteering, awards] };
    const parent = { section: "extras", parentId: role.id } as const;

    const next = editBullets(resume, parent, (bullets) => [
      ...bullets,
      newBullet("Taught 12 kids"),
    ]);
    expect(bulletsOf(next, parent)?.map((line) => line.text)).toEqual([
      "Ran a weekly code club",
      "Taught 12 kids",
    ]);
    expect(extrasOf(next)[1]).toBe(awards);
    expect(next.experience).toBe(resume.experience);
    expect(editBullets(resume, { section: "extras", parentId: "missing" }, () => [])).toBe(resume);
    expect(bulletsOf({ ...resume, extras: undefined }, parent)).toBeNull();
  });
});

describe("setHidden", () => {
  it("sets the flag, and clears it rather than storing false", () => {
    const line = newBullet("Shipped the new checkout");
    const hidden = setHidden(line, true);
    expect(hidden.hidden).toBe(true);
    expect(setHidden(hidden, true)).toBe(hidden);
    const shown = setHidden(hidden, false);
    expect(shown.hidden).toBeUndefined();
    expect(JSON.parse(JSON.stringify(shown))).not.toHaveProperty("hidden");
    expect(setHidden(line, false)).toBe(line);
  });
});

describe("pasting lines", () => {
  it("strips list markers but keeps numbers that are part of the text", () => {
    expect(
      splitPastedLines(
        "• Led a team of 5\n- Cut costs 20%\r\n\n1. Shipped v2\n-20% churn\n3.5 GPA\n",
      ),
    ).toEqual(["Led a team of 5", "Cut costs 20%", "Shipped v2", "-20% churn", "3.5 GPA"]);
  });

  it("joins a single pasted line into the current one at the caret", () => {
    expect(
      planPaste({ before: "Led ", after: " daily", lines: ["5 people"], room: 3, maxChars: 100 }),
    ).toEqual({
      current: "Led 5 people daily",
      added: [],
      dropped: 0,
      caret: 12,
    });
  });

  it("splits several lines into new bullets and moves the text after the caret to the last", () => {
    expect(
      planPaste({ before: "A", after: "!", lines: ["1", "2", "3"], room: 5, maxChars: 100 }),
    ).toEqual({
      current: "A1",
      added: ["2", "3!"],
      dropped: 0,
      caret: 1,
    });
  });

  it("drops lines past the entry's cap and clips long ones", () => {
    const plan = planPaste({
      before: "",
      after: "",
      lines: ["x", "yyyy", "z"],
      room: 1,
      maxChars: 3,
    });
    expect(plan).toEqual({ current: "x", added: ["yyy"], dropped: 1, caret: 3 });
  });

  it("turns line breaks into spaces for typed or dropped text", () => {
    expect(singleLine("Led a team \n of 5\r\nengineers")).toBe("Led a team of 5 engineers");
    expect(singleLine("Led a team  ")).toBe("Led a team  ");
  });
});

describe("skills", () => {
  it("splits pasted skills on commas, semicolons, pipes, bullets and new lines", () => {
    expect(splitSkills("React, Node.js;  SQL | Figma • CI/CD\nC#")).toEqual([
      "React",
      "Node.js",
      "SQL",
      "Figma",
      "CI/CD",
      "C#",
    ]);
  });

  it("keeps the part after the last separator as the draft", () => {
    expect(splitSkillDraft("React, Ty")).toEqual({ done: ["React"], draft: "Ty" });
    expect(splitSkillDraft("React,")).toEqual({ done: ["React"], draft: "" });
    expect(splitSkillDraft("Type")).toEqual({ done: [], draft: "Type" });
  });

  it("adds new skills once, ignoring case, within the caps", () => {
    const items = ["React"];
    expect(addSkills(items, ["react", "SQL", "sql", "Go"], 3, 100)).toEqual(["React", "SQL", "Go"]);
    expect(addSkills(items, ["REACT"], 10, 100)).toBe(items);
    expect(addSkills([], ["TypeScript"], 10, 4)).toEqual(["Type"]);
  });
});

describe("dates", () => {
  it.each(["Present", "present", " Current ", "Now", "ongoing"])(
    "treats %j as still going",
    (value) => {
      expect(isPresentDate(value)).toBe(true);
    },
  );

  it.each(["", "2024", "Mar 2024", "Presently"])("treats %j as an end date", (value) => {
    expect(isPresentDate(value)).toBe(false);
  });
});

describe("entry meta line", () => {
  it("spans dates and says now for a current role", () => {
    expect(dateSpan("Jan 2021", "Present")).toBe("Jan 2021 – now");
    expect(dateSpan("2018", "2021")).toBe("2018 – 2021");
    expect(dateSpan("2019", "")).toBe("2019");
    expect(dateSpan("", "")).toBe("");
  });

  it("joins only the parts that are filled in", () => {
    expect(metaLine(["Jan 2021 – now", "  ", "Remote"])).toBe("Jan 2021 – now · Remote");
    expect(metaLine(["", " "])).toBeNull();
  });
});
