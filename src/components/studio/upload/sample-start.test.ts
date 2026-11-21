import { beforeEach, describe, expect, it } from "vitest";
import { createSampleResume } from "@/lib/resume/sample";
import { emptyResume } from "@/lib/resume/schema";
import { useStudioStore } from "@/lib/store/resume-store";
import { latestSampleId, openSample } from "./sample-start";

beforeEach(() => {
  useStudioStore.getState().clearAll();
});

describe("openSample", () => {
  it("adds the sample the first time and opens it", () => {
    const { id, created } = openSample(1_000);
    const state = useStudioStore.getState();
    expect(created).toBe(true);
    expect(state.activeId).toBe(id);
    expect(state.resumes[id]?.source).toBe("sample");
  });

  it("opens the sample already here instead of making another copy", () => {
    const first = openSample(1_000);
    useStudioStore.getState().addResume(emptyResume(2_000));
    const again = openSample(3_000);
    const state = useStudioStore.getState();
    expect(again).toEqual({ id: first.id, created: false });
    expect(state.activeId).toBe(first.id);
    expect(state.order).toHaveLength(2);
  });
});

describe("latestSampleId", () => {
  it("picks the most recently edited sample, and none when there are only own resumes", () => {
    const store = useStudioStore.getState();
    store.addResume(emptyResume(1_000));
    expect(latestSampleId(useStudioStore.getState())).toBeNull();

    const older = createSampleResume(2_000);
    const newer = createSampleResume(5_000);
    store.addResume(newer);
    store.addResume(older);
    expect(latestSampleId(useStudioStore.getState())).toBe(newer.id);
  });
});
