import { describe, expect, it } from "vitest";
import { candidateCount, findCandidates } from "./vocabulary";

describe("candidateCount", () => {
  it("counts an acronym and its long form as one skill", () => {
    expect(findCandidates("BLS certification")[0]?.label).toBe("BLS");
    expect(findCandidates("Basic life support certification")[0]?.label).toBe("BLS");
  });

  it("counts each skill Otto knows once, for the page's 'about' figure", () => {
    expect(candidateCount()).toBe(374);
  });
});
