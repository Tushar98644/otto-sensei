import { describe, expect, it } from "vitest";
import { noteReadByAI, noteReadByRules, noteReadWell, rereadableFile } from "./import-notes";

const pdf = (name: string) => new File(["%PDF-1.7"], name, { type: "application/pdf" });

describe("import notes", () => {
  it("keeps only the latest well-read upload's file for a re-read", () => {
    const first = pdf("first.pdf");
    const second = pdf("second.pdf");
    noteReadWell("resume-1", first);
    expect(rereadableFile("resume-1")).toBe(first);
    noteReadWell("resume-2", second);
    expect(rereadableFile("resume-1")).toBeNull();
    expect(rereadableFile("resume-2")).toBe(second);
  });

  it("lets go of the file once the AI has re-read it", () => {
    noteReadWell("resume-3", pdf("third.pdf"));
    noteReadByAI("resume-3");
    expect(rereadableFile("resume-3")).toBeNull();
  });

  it("doesn't offer a re-read for a resume the rules read because the allowance ran out", () => {
    noteReadByRules("resume-4", true);
    expect(rereadableFile("resume-4")).toBeNull();
  });
});
