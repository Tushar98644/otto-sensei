import { beforeEach, describe, expect, it } from "vitest";
import { useStudioStore } from "@/lib/store/resume-store";
import { openExampleInStudio } from "./open-example";

beforeEach(() => {
  useStudioStore.getState().clearAll();
});

describe("openExampleInStudio", () => {
  it("adds the example as the person's own resume and opens it on Fix", async () => {
    expect(await openExampleInStudio("data-analyst")).toBe(true);
    const state = useStudioStore.getState();
    const resume = state.activeId ? state.resumes[state.activeId] : undefined;
    expect(resume?.basics.name).toBe("Emily Nguyen");
    expect(resume?.source).toBe("scratch");
    expect(resume?.template).toBe("classic");
    expect(state.step).toBe("fix");
  });

  it("opens nothing for an example that doesn't exist", async () => {
    expect(await openExampleInStudio("astronaut")).toBe(false);
    expect(useStudioStore.getState().order).toEqual([]);
  });
});
