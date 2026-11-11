import { describe, expect, it } from "vitest";
import { lintResume } from "@/lib/lint/bullets";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import { fixOutline } from "./outline";

function resume(): Resume {
  const base = emptyResume(0);
  return {
    ...base,
    summary: "I am a hard worker.",
    experience: [
      {
        id: "job",
        title: "Engineer",
        company: "Acme",
        location: "",
        startDate: "Jan 2022",
        endDate: "",
        bullets: [
          { id: "j1", text: "Cut deploy time 40% with a new CI pipeline" },
          { id: "j2", text: "Worked on the billing system" },
        ],
      },
    ],
    projects: [{ id: "p", name: "", link: "", bullets: [{ id: "p1", text: "Fixed bugs" }] }],
    education: [
      {
        id: "s",
        school: "MIT",
        degree: "BSc",
        field: "",
        location: "",
        startDate: "",
        endDate: "",
        bullets: [{ id: "s1", text: "GPA: 3.8/4.0" }],
      },
    ],
  };
}

describe("fixOutline", () => {
  it("lists sections in print order with the entries that hold lines and their counts", () => {
    const value = resume();
    const byBullet = new Map(Object.entries(lintResume(value).byBullet));
    const outline = fixOutline(value, byBullet);
    expect(outline[0]).toEqual({
      key: "basics",
      label: "Name and contact",
      needWork: 0,
      entries: [],
    });
    const byKey = Object.fromEntries(outline.map((section) => [section.key, section]));
    expect(byKey.summary?.needWork).toBe(1);
    expect(byKey.experience).toMatchObject({
      needWork: 1,
      entries: [{ id: "job", label: "Engineer · Acme", needWork: 1 }],
    });
    expect(byKey.projects?.entries).toEqual([{ id: "p", label: "New project", needWork: 1 }]);
    expect(byKey.education?.entries).toEqual([{ id: "s", label: "BSc · MIT", needWork: 0 }]);
    expect(byKey.skills).toEqual({ key: "skills", label: "Skills", needWork: 0, entries: [] });
  });
});
