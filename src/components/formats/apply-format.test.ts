import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSampleResume } from "@/lib/resume/sample";
import { emptyResume, type Resume } from "@/lib/resume/schema";
import { ResumeSchema } from "@/lib/resume/validation";
import { EDIT_LABELS } from "@/lib/store/history";
import {
  chosenFormat,
  clearChosenFormat,
  formatTarget,
  inFormat,
  openFormat,
  sampleWithFormat,
  type FormatStore,
} from "./apply-format";

function resumes(...items: Resume[]): Record<string, Resume> {
  return Object.fromEntries(items.map((item) => [item.id, item]));
}

function fakeStore(items: Resume[], activeId: string | null = null) {
  const store = {
    activeId,
    order: items.map((item) => item.id),
    resumes: resumes(...items),
    setActive: vi.fn<FormatStore["setActive"]>(),
    updateResume: vi.fn<FormatStore["updateResume"]>(),
    setStep: vi.fn<FormatStore["setStep"]>(),
  };
  return store satisfies FormatStore;
}

const first = { ...emptyResume(1), id: "first" };
const second = { ...emptyResume(2), id: "second" };

beforeEach(() => clearChosenFormat());

describe("formatTarget", () => {
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

  it("prefers the resume picked on the page while it still exists", () => {
    const studio = {
      activeId: "first",
      order: ["first", "second"],
      resumes: resumes(first, second),
    };
    expect(formatTarget(studio, "second")).toBe(second);
    expect(formatTarget(studio, "gone")).toBe(first);
  });

  it("has nothing to apply to without resumes", () => {
    expect(formatTarget({ activeId: null, order: [], resumes: {} })).toBeNull();
    expect(formatTarget({ activeId: "gone", order: [], resumes: {} })).toBeNull();
  });
});

describe("inFormat", () => {
  it("starts a valid sample resume in the chosen format and its section order", () => {
    const sample = inFormat(createSampleResume(5), "developer");
    expect(sample).toMatchObject({ template: "developer", source: "sample", createdAt: 5 });
    expect(ResumeSchema.safeParse(sample).success).toBe(true);
    expect(sample.sectionOrder).toEqual([
      "summary",
      "skills",
      "projects",
      "experience",
      "education",
      "certifications",
    ]);
  });

  it("keeps someone's own section order", () => {
    const own = emptyResume();
    const styled = inFormat(own, "developer");
    expect(styled.template).toBe("developer");
    expect(styled.sectionOrder).toEqual(own.sectionOrder);
  });

  it("keeps the default order for a format without a hint", () => {
    const sample = createSampleResume();
    expect(inFormat(sample, "classic").sectionOrder).toEqual(sample.sectionOrder);
  });

  it("draws the format previews from the same sample", () => {
    expect(sampleWithFormat("minimal", 5)).toMatchObject({
      template: "minimal",
      source: "sample",
      createdAt: 5,
    });
  });
});

describe("openFormat", () => {
  it("sets the open resume to the format and goes to Download", () => {
    const store = fakeStore([first, second], "second");
    expect(openFormat(store, "modern")).toBe("download");
    expect(store.setActive).not.toHaveBeenCalled();
    expect(store.updateResume).toHaveBeenCalledWith("second", expect.any(Function), {
      label: EDIT_LABELS.format,
    });
    const updater = store.updateResume.mock.calls[0]?.[1];
    expect(updater?.(second).template).toBe("modern");
    expect(store.setStep).toHaveBeenCalledWith("download");
    expect(chosenFormat()).toBeNull();
  });

  it("opens the picked resume and leaves a format it already has alone", () => {
    const store = fakeStore([first, { ...second, template: "minimal" }], "first");
    openFormat(store, "minimal", "second");
    expect(store.setActive).toHaveBeenCalledWith("second");
    expect(store.updateResume).not.toHaveBeenCalled();
    expect(store.setStep).toHaveBeenCalledWith("download");
  });

  it("gives a sample the format's section order, as a new sample in that format would have", () => {
    const sample = { ...createSampleResume(5), id: "sample" };
    const store = fakeStore([sample], "sample");
    openFormat(store, "developer", "sample");
    const updater = store.updateResume.mock.calls[0]?.[1];
    expect(updater?.(sample)).toEqual(inFormat(sample, "developer"));
    expect(updater?.(sample).sectionOrder[1]).toBe("skills");
  });

  it("opens a Pro format like any other: the download step is where the plan applies", () => {
    const store = fakeStore([first]);
    expect(openFormat(store, "executive")).toBe("download");
    expect(store.updateResume).toHaveBeenCalledOnce();
  });

  it("with no resume, opens Upload with the format waiting instead of adding a sample", () => {
    const store = fakeStore([]);
    expect(openFormat(store, "modern")).toBe("upload");
    expect(store.setStep).toHaveBeenCalledWith("upload");
    expect(store.updateResume).not.toHaveBeenCalled();
    expect(chosenFormat()).toBe("modern");
  });

  it("drops a waiting format once there is a resume to apply to", () => {
    openFormat(fakeStore([]), "modern");
    openFormat(fakeStore([first]), "compact");
    expect(chosenFormat()).toBeNull();
  });
});
