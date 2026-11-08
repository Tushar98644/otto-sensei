import { describe, expect, it } from "vitest";
import { createSampleResume } from "@/lib/resume/sample";
import type { Resume, TemplateId } from "@/lib/resume/schema";
import { sectionOrderOffer } from "./format-choice";
import { pdfKey } from "./use-resume-pdf";

function resume(template: TemplateId, sectionOrder?: Resume["sectionOrder"]): Resume {
  const sample = createSampleResume(0);
  return { ...sample, template, sectionOrder: sectionOrder ?? sample.sectionOrder };
}

describe("sectionOrderOffer", () => {
  it("offers to move Skills and Projects up when Developer is picked", () => {
    expect(sectionOrderOffer(resume("developer"))).toEqual({
      moved: "Skills and Projects",
      count: 2,
      order: ["summary", "skills", "projects", "experience", "education", "certifications"],
    });
  });

  it("names a single section on its own", () => {
    const offer = sectionOrderOffer(
      resume("developer", ["summary", "projects", "experience", "skills"]),
    );
    expect(offer).toMatchObject({
      moved: "Skills",
      count: 1,
      order: ["summary", "skills", "projects", "experience"],
    });
  });

  it("goes away once the order follows the format", () => {
    const offer = sectionOrderOffer(resume("developer"));
    expect(offer).not.toBeNull();
    expect(sectionOrderOffer(resume("developer", offer!.order))).toBeNull();
  });

  it("never offers anything for formats without a suggested order", () => {
    for (const id of ["classic", "modern", "compact", "executive", "minimal"] as const) {
      expect(sectionOrderOffer(resume(id))).toBeNull();
    }
  });
});

describe("pdfKey", () => {
  it("changes with the format, so the preview and the check never show an old one", () => {
    const base = resume("classic");
    expect(pdfKey(base, "LETTER")).not.toBe(pdfKey({ ...base, template: "modern" }, "LETTER"));
    expect(pdfKey(base, "LETTER")).not.toBe(pdfKey(base, "A4"));
  });

  it("treats a resume with no saved format as Classic", () => {
    const base = resume("classic");
    const old: Resume = { ...base };
    delete old.template;
    expect(pdfKey(old, "A4")).toBe(pdfKey(base, "A4"));
  });
});
