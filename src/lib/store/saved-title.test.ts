import { describe, expect, it } from "vitest";
import { STUDIO_STORAGE_KEY } from "./persisted";
import { SAVED_STUDIO_KEY, savedResumeTitle } from "./saved-title";

const save = (state: unknown) => JSON.stringify({ state, version: 2 });

const resume = (title: string, name = "") => ({ title, basics: { name } });

describe("savedResumeTitle", () => {
  it("reads the studio's own save", () => {
    expect(SAVED_STUDIO_KEY).toBe(STUDIO_STORAGE_KEY);
  });

  it("names the resume the studio last had open", () => {
    const raw = save({
      resumes: { a: resume("Marketing"), b: resume("Design lead") },
      order: ["a", "b"],
      activeId: "b",
    });
    expect(savedResumeTitle(raw)).toBe("Design lead");
  });

  it("falls back to the first resume, then to the person's name", () => {
    const raw = save({ resumes: { a: resume("  ", " Maya  Chen ") }, order: ["a"], activeId: "gone" });
    expect(savedResumeTitle(raw)).toBe("Maya Chen");
    expect(savedResumeTitle(save({ resumes: { a: resume("") }, order: ["a"] }))).toBe(
      "your resume",
    );
  });

  it("says nothing for an empty, missing or broken save", () => {
    expect(savedResumeTitle(null)).toBeNull();
    expect(savedResumeTitle("{not json")).toBeNull();
    expect(savedResumeTitle(save({ resumes: {}, order: [], activeId: null }))).toBeNull();
    expect(savedResumeTitle(JSON.stringify({ state: "nope" }))).toBeNull();
  });
});
