import { describe, expect, it } from "vitest";
import { NO_MEMORY } from "./filter-memory";
import { readFilterMemory, rememberFilters } from "./use-filter-memory";

describe("filter memory", () => {
  it("keeps each account's filters apart, and holds them for the visit when storage is blocked", () => {
    expect(readFilterMemory("user-a")).toEqual(NO_MEMORY);
    rememberFilters("user-a", { q: "react", resumeId: "cv-1" });
    rememberFilters("user-a", { postedWithin: 7 });
    expect(readFilterMemory("user-a")).toEqual({
      ...NO_MEMORY,
      q: "react",
      postedWithin: 7,
      resumeId: "cv-1",
    });
    expect(readFilterMemory("user-b")).toEqual(NO_MEMORY);
  });

  it("remembers nothing without an account", () => {
    rememberFilters(null, { q: "design" });
    expect(readFilterMemory("user-c")).toEqual(NO_MEMORY);
  });
});
