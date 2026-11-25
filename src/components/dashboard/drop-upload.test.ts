import { describe, expect, it } from "vitest";
import { carriesFiles, dropHint, droppedResume } from "./drop-upload";
import { EN } from "./messages-testing";

const MB = 1024 * 1024;
const PDF = { name: "resume.pdf", type: "application/pdf", size: 120_000 };
const DOCX = {
  name: "resume.docx",
  type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  size: 80_000,
};

describe("droppedResume", () => {
  it("takes one PDF or Word file", () => {
    expect(droppedResume([PDF], EN.dashboard)).toEqual({ file: PDF, problem: null });
    expect(droppedResume([DOCX], EN.dashboard)).toEqual({ file: DOCX, problem: null });
  });

  it("says plainly why any other drop can't be used", () => {
    expect(droppedResume([], EN.dashboard)).toEqual({
      file: null,
      problem: "That wasn't a file. Drop a PDF or Word file.",
    });
    expect(droppedResume([PDF, DOCX], EN.dashboard)).toEqual({
      file: null,
      problem: "Drop one file at a time.",
    });
    expect(
      droppedResume([{ name: "photo.png", type: "image/png", size: 1000 }], EN.dashboard).problem,
    ).toMatch(/isn't supported/);
    expect(droppedResume([{ ...PDF, size: 0 }], EN.dashboard).problem).toBe(
      "That file is empty. Choose another one.",
    );
    expect(droppedResume([{ ...PDF, size: 50 * MB }], EN.dashboard).problem).toMatch(/too big/);
  });

  it("names the formats and the size limit in the overlay", () => {
    expect(dropHint(EN.dashboard)).toBe("PDF or Word, up to 4 MB. Otto opens it in the studio.");
  });
});

describe("carriesFiles", () => {
  it("is true only for a drag that holds files", () => {
    expect(carriesFiles({ types: ["Files"] })).toBe(true);
    expect(carriesFiles({ types: ["text/plain", "Files"] })).toBe(true);
    expect(carriesFiles({ types: ["text/plain"] })).toBe(false);
    expect(carriesFiles(null)).toBe(false);
  });
});
