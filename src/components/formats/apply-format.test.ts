import { describe, expect, it } from "vitest";
import { ResumeSchema, emptyResume, type Resume } from "@/lib/resume/schema";
import { formatTarget, sampleWithFormat } from "./apply-format";

function resumes(...items: Resume[]): Record<string, Resume> {
  return Object.fromEntries(items.map((item) => [item.id, item]));
}

describe("formatTarget", () => {
  const first = { ...emptyResume(1), id: "first" };
  const second = { ...emptyResume(2), id: "second" };

  it("applies to the resume open in the studio", () => {
    expect(
      formatTarget({
        activeId: "second",
        order: ["first", "second"],
        resumes: resumes(first, second),
      }),
    ).toBe(second);
  });

  it("falls back to the newest resume when none is open", () => {
    expect(
      formatTarget({ activeId: null, order: ["first", "second"], resumes: resumes(first, second) }),
    ).toBe(first);
  });

  it("has nothing to apply to without resumes", () => {
    expect(formatTarget({ activeId: null, order: [], resumes: {} })).toBeNull();
    expect(formatTarget({ activeId: "gone", order: [], resumes: {} })).toBeNull();
  });
});

describe("sampleWithFormat", () => {
  it("starts a valid sample resume in the chosen format", () => {
    const sample = sampleWithFormat("minimal", 5);
    expect(sample).toMatchObject({ template: "minimal", source: "sample", createdAt: 5 });
    expect(ResumeSchema.safeParse(sample).success).toBe(true);
  });

  it("uses the format's suggested section order", () => {
    expect(sampleWithFormat("developer").sectionOrder).toEqual([
      "summary",
      "skills",
      "projects",
      "experience",
      "education",
      "certifications",
    ]);
    expect(sampleWithFormat("classic").sectionOrder).toEqual(emptyResume().sectionOrder);
  });
});
