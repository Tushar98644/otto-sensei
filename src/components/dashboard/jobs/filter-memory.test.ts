import { describe, expect, it } from "vitest";
import { DEFAULT_FILTERS } from "@/lib/job-feed/types";
import {
  activeFilterCount,
  CLEARED,
  memoryFilters,
  NO_MEMORY,
  parseFilterMemory,
  searchedOrNarrowed,
} from "./filter-memory";

describe("parseFilterMemory", () => {
  it("keeps a search, a posting window, the eligibility switch and the picked resume", () => {
    expect(
      parseFilterMemory({ q: " design ", postedWithin: 7, eligibleOnly: true, resumeId: "cv-1" }),
    ).toEqual({ q: "design", postedWithin: 7, eligibleOnly: true, resumeId: "cv-1" });
  });

  it("drops anything stored badly, so a broken entry opens the defaults", () => {
    for (const raw of [null, "x", 3, [], {}]) expect(parseFilterMemory(raw)).toEqual(NO_MEMORY);
    expect(
      parseFilterMemory({ q: 5, postedWithin: 14, eligibleOnly: "yes", resumeId: "" }),
    ).toEqual(NO_MEMORY);
    expect(parseFilterMemory({ resumeId: "x".repeat(65) }).resumeId).toBeNull();
    expect(parseFilterMemory({ q: "a".repeat(150) }).q).toHaveLength(100);
  });
});

describe("memoryFilters", () => {
  const memory = { q: "react", postedWithin: 30, eligibleOnly: true, resumeId: null } as const;

  it("never narrows by role, level or place: the Looking for line does that", () => {
    const filters = memoryFilters(
      { ...memory, ...({ role: "design", level: "senior", place: "Berlin" } as object) },
      { remote: true, profileReady: true },
    );
    expect(filters).toEqual({
      ...DEFAULT_FILTERS,
      q: "react",
      postedWithin: 30,
      eligibleOnly: true,
      remote: true,
    });
  });

  it("asks for jobs you can take only once there's a work profile to check them against", () => {
    expect(memoryFilters(memory, { remote: false, profileReady: false }).eligibleOnly).toBe(false);
  });
});

describe("filter counts", () => {
  it("counts what sits behind Filters, not the search box", () => {
    expect(activeFilterCount(DEFAULT_FILTERS)).toBe(0);
    expect(activeFilterCount({ ...DEFAULT_FILTERS, q: "react" })).toBe(0);
    expect(
      activeFilterCount({ ...DEFAULT_FILTERS, postedWithin: 7, remote: true, eligibleOnly: true }),
    ).toBe(3);
  });

  it("calls a list narrowed by a search or a filter, but not by remote, which you chose above", () => {
    expect(searchedOrNarrowed({ ...DEFAULT_FILTERS, remote: true })).toBe(false);
    expect(searchedOrNarrowed({ ...DEFAULT_FILTERS, q: "react" })).toBe(true);
    expect(searchedOrNarrowed({ ...DEFAULT_FILTERS, postedWithin: 7 })).toBe(true);
    expect(searchedOrNarrowed({ ...DEFAULT_FILTERS, eligibleOnly: true })).toBe(true);
    expect(
      searchedOrNarrowed(
        memoryFilters({ ...NO_MEMORY, ...CLEARED }, { remote: true, profileReady: true }),
      ),
    ).toBe(false);
  });
});
