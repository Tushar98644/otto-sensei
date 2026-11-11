import { describe, expect, it } from "vitest";
import { emptyResume, newExperience, type Experience } from "@/lib/resume/schema";
import { ResumeSchema } from "@/lib/resume/validation";
import { insertAfter } from "./edits";
import { groupRoles, moveRoleUnit, newRole, parseRoleLayout, roleLayout } from "./roles";

function job(id: string, company: string): Experience {
  return { ...newExperience(), id, company };
}

const ids = (jobs: readonly { id: string }[]) => jobs.map((item) => item.id);

describe("groupRoles", () => {
  it("groups consecutive jobs at one company, ignoring case, accents and punctuation", () => {
    const jobs = [
      job("a", "Northwind"),
      job("b", "  northwind "),
      job("c", "Contoso, Inc."),
      job("d", "CONTOSO Inc"),
      job("e", "Café Uno"),
      job("f", "Cafe uno"),
    ];
    expect(groupRoles(jobs)).toEqual([
      { ids: ["a", "b"], company: "Northwind" },
      { ids: ["c", "d"], company: "Contoso, Inc." },
      { ids: ["e", "f"], company: "Café Uno" },
    ]);
  });

  it("keeps jobs apart when another company sits between them", () => {
    const jobs = [job("a", "Northwind"), job("b", "Contoso"), job("c", "Northwind")];
    expect(groupRoles(jobs).map((unit) => unit.ids)).toEqual([["a"], ["b"], ["c"]]);
  });

  it("never groups jobs without a company", () => {
    const jobs = [job("a", ""), job("b", "  "), job("c", "-")];
    expect(groupRoles(jobs).map((unit) => unit.ids)).toEqual([["a"], ["b"], ["c"]]);
  });

  it("returns no units for no jobs", () => {
    expect(groupRoles([])).toEqual([]);
  });
});

describe("roleLayout", () => {
  it("turns into the same groups and stays equal while a field is typed in", () => {
    const jobs = [job("a", "Northwind"), job("b", "Northwind"), job("c", "Contoso")];
    const layout = roleLayout(jobs);
    expect(parseRoleLayout(layout)).toEqual([["a", "b"], ["c"]]);

    const typed = jobs.map((item) => (item.id === "c" ? { ...item, title: "Designer" } : item));
    expect(roleLayout(typed)).toEqual(layout);
  });

  it("changes when a company edit regroups the jobs", () => {
    const jobs = [job("a", "Northwind"), job("b", "Contoso")];
    const renamed = jobs.map((item) =>
      item.id === "b" ? { ...item, company: "northwind" } : item,
    );
    expect(parseRoleLayout(roleLayout(renamed))).toEqual([["a", "b"]]);
  });

  it("keeps ids with any characters intact", () => {
    const jobs = [job('x","y', "Northwind"), job("z]", "Northwind")];
    expect(parseRoleLayout(roleLayout(jobs))).toEqual([['x","y', "z]"]]);
  });
});

describe("moveRoleUnit", () => {
  const jobs = [
    job("lone", "Contoso"),
    job("r1", "Northwind"),
    job("r2", "Northwind"),
    job("last", "Fabrikam"),
  ];

  it("moves a lone job past a whole company, never between its roles", () => {
    expect(ids(moveRoleUnit(jobs, "lone", 1))).toEqual(["r1", "r2", "lone", "last"]);
    expect(ids(moveRoleUnit(jobs, "last", -1))).toEqual(["lone", "last", "r1", "r2"]);
  });

  it("moves a company with all of its roles, from any of them", () => {
    expect(ids(moveRoleUnit(jobs, "r2", -1))).toEqual(["r1", "r2", "lone", "last"]);
    expect(ids(moveRoleUnit(jobs, "r1", 1))).toEqual(["lone", "last", "r1", "r2"]);
  });

  it("returns the same list past either end or for an unknown id", () => {
    expect(moveRoleUnit(jobs, "lone", -1)).toBe(jobs);
    expect(moveRoleUnit(jobs, "last", 1)).toBe(jobs);
    expect(moveRoleUnit(jobs, "missing", 1)).toBe(jobs);
  });

  it("keeps every job object as it was", () => {
    const moved = moveRoleUnit(jobs, "lone", 1);
    for (const item of jobs) expect(moved).toContain(item);
  });
});

describe("newRole", () => {
  it("starts a role at the same company that joins the group when inserted after it", () => {
    const jobs = [job("a", "Northwind"), job("b", "Contoso")];
    const role = newRole("Northwind");
    expect(role.company).toBe("Northwind");
    expect(role.title).toBe("");
    expect(role.id).not.toBe("a");

    const next = insertAfter(jobs, "a", [role]);
    expect(groupRoles(next).map((unit) => unit.ids)).toEqual([["a", role.id], ["b"]]);
    expect(ResumeSchema.safeParse({ ...emptyResume(0), experience: next }).success).toBe(true);
  });
});
