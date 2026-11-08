import { describe, expect, it } from "vitest";
import { TEMPLATE_IDS, emptyResume, type Resume, type SectionKey } from "@/lib/resume/schema";
import {
  TEMPLATE_INFO,
  TEMPLATE_LIST,
  followsHint,
  isTemplateId,
  orderByHint,
  templateOf,
  withTemplate,
} from "./templates";

const DEVELOPER_HINT = TEMPLATE_INFO.developer.sectionOrderHint ?? [];

describe("format info", () => {
  it("lists every format once, in the schema's order", () => {
    expect(TEMPLATE_LIST.map((info) => info.id)).toEqual([...TEMPLATE_IDS]);
    for (const id of TEMPLATE_IDS) expect(TEMPLATE_INFO[id].id).toBe(id);
  });

  it("only Developer suggests a section order", () => {
    expect(TEMPLATE_LIST.filter((info) => info.sectionOrderHint).map((info) => info.id)).toEqual([
      "developer",
    ]);
    expect(DEVELOPER_HINT.slice(0, 3)).toEqual(["summary", "skills", "projects"]);
  });
});

describe("templateOf", () => {
  it("reads the saved format", () => {
    expect(templateOf({ template: "minimal" })).toBe("minimal");
  });

  it("falls back to Classic when the stored value is missing or stale", () => {
    expect(templateOf({})).toBe("classic");
    expect(templateOf({ template: "retro" } as unknown as Resume)).toBe("classic");
  });

  it("recognises only real ids", () => {
    expect(isTemplateId("executive")).toBe(true);
    expect(isTemplateId("Executive")).toBe(false);
    expect(isTemplateId(undefined)).toBe(false);
  });
});

describe("orderByHint", () => {
  it("moves the hinted sections first and keeps the rest in place", () => {
    const order: SectionKey[] = [
      "summary",
      "experience",
      "projects",
      "education",
      "skills",
      "certifications",
    ];
    expect(orderByHint(order, DEVELOPER_HINT)).toEqual([
      "summary",
      "skills",
      "projects",
      "experience",
      "education",
      "certifications",
    ]);
  });

  it("never brings back a section the user hid", () => {
    expect(orderByHint(["experience", "skills"], DEVELOPER_HINT)).toEqual(["skills", "experience"]);
  });

  it("tells whether an order already follows the hint", () => {
    expect(followsHint(["summary", "skills", "projects", "experience"], DEVELOPER_HINT)).toBe(true);
    expect(followsHint(["summary", "experience", "skills"], DEVELOPER_HINT)).toBe(false);
  });
});

describe("withTemplate", () => {
  it("sets the format and leaves the rest alone", () => {
    const resume = emptyResume(0);
    const next = withTemplate(resume, "compact");
    expect(next).toEqual({ ...resume, template: "compact" });
    expect(resume.template).toBe("classic");
  });
});
