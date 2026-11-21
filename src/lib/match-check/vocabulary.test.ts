import { describe, expect, it } from "vitest";
import { candidateCount, findCandidates } from "./vocabulary";

describe("candidateCount", () => {
  it("counts an acronym and its long form as one skill", () => {
    expect(findCandidates("BLS certification")[0]?.label).toBe("BLS");
    expect(findCandidates("Basic life support certification")[0]?.label).toBe("BLS");
  });

  it("counts each skill Otto knows once, for the page's 'about' figure", () => {
    expect(candidateCount()).toBe(378);
  });
});

describe("findCandidates", () => {
  const labels = (text: string) => findCandidates(text).map((found) => found.label);

  it("knows Epic, PALS, CUDA and Gong, by their names' own spelling", () => {
    expect(labels("Document care in Epic")).toEqual(["Epic"]);
    expect(labels("Pediatric Advanced Life Support")).toEqual(["PALS"]);
    expect(labels("PALS preferred")).toEqual(["PALS"]);
    expect(labels("Experience writing CUDA kernels")).toEqual(["CUDA"]);
    expect(labels("Salesforce and Gong every day")).toEqual(["Gong"]);
    expect(labels("An epic launch, then ring the gong with your pals")).toEqual([]);
  });
});
