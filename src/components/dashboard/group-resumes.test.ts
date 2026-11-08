import { describe, expect, it } from "vitest";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import { groupResumes } from "./group-resumes";

function resume(id: string, baseResumeId?: string): Resume {
  return {
    ...emptyResume(),
    id,
    source: baseResumeId ? "tailored" : "import",
    tailor: baseResumeId
      ? { baseResumeId, jobTitle: "Engineer", company: "Acme", keywords: [], createdAt: 1 }
      : null,
  };
}

describe("groupResumes", () => {
  it("nests tailored copies under their base and keeps the order", () => {
    const list = [resume("t2", "a"), resume("b"), resume("t1", "a"), resume("a")];
    const groups = groupResumes(list);
    expect(groups.map((g) => g.resume.id)).toEqual(["b", "a"]);
    expect(groups[1]?.tailored.map((r) => r.id)).toEqual(["t2", "t1"]);
    expect(groups[0]?.tailored).toEqual([]);
  });

  it("keeps a copy whose base was deleted as its own row", () => {
    const groups = groupResumes([resume("t1", "gone"), resume("a")]);
    expect(groups.map((g) => g.resume.id)).toEqual(["t1", "a"]);
  });

  it("ignores a copy that points at itself", () => {
    const groups = groupResumes([resume("x", "x")]);
    expect(groups.map((g) => g.resume.id)).toEqual(["x"]);
  });

  it("returns nothing for no resumes", () => {
    expect(groupResumes([])).toEqual([]);
  });
});
