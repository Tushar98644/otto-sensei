import { beforeEach, describe, expect, it } from "vitest";
import { chosenFormat, clearChosenFormat } from "@/components/formats/apply-format";
import { emptyResume } from "@/lib/resume/schema";
import { useStudioStore } from "@/lib/store/resume-store";
import { openFormatInStudio } from "./open-format";

const store = () => useStudioStore.getState();

beforeEach(() => {
  store().clearAll();
  clearChosenFormat();
});

describe("openFormatInStudio", () => {
  it("opens a Pro format on the open resume without asking for Pro first", async () => {
    const own = emptyResume();
    store().addResume(own);
    await openFormatInStudio("modern");
    expect(store().resumes[own.id]?.template).toBe("modern");
    expect(store().step).toBe("download");
    expect(store().order).toEqual([own.id]);
  });

  it("with no resume, opens Upload with the format chosen and adds nothing", async () => {
    await openFormatInStudio("executive");
    expect(store().order).toEqual([]);
    expect(store().step).toBe("upload");
    expect(chosenFormat()).toBe("executive");
  });
});
