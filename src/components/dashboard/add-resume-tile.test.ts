import { describe, expect, it } from "vitest";
import { UPLOAD_LIMITS } from "@/config/plans";
import { droppedUpload } from "./add-resume-tile";

const pdf = { name: "Resume.pdf", type: "application/pdf", size: 2048 };
const docx = { name: "cv.DOCX", type: "", size: 2048 };

describe("droppedUpload", () => {
  it("takes one PDF or Word file, even one the browser gave no type", () => {
    expect(droppedUpload([pdf])).toEqual({ file: pdf });
    expect(droppedUpload([docx])).toEqual({ file: docx });
  });

  it("says why a drop can't be used", () => {
    expect(droppedUpload([pdf, docx])).toEqual({ problem: "Drop one file at a time." });
    const png = { name: "photo.png", type: "image/png", size: 10 };
    expect(droppedUpload([png])).toEqual({ problem: expect.stringContaining("isn't supported") });
    expect(droppedUpload([{ ...pdf, size: 0 }])).toEqual({
      problem: expect.stringContaining("empty"),
    });
    expect(droppedUpload([{ ...pdf, size: UPLOAD_LIMITS.maxBytes + 1 }])).toEqual({
      problem: expect.stringContaining("too big"),
    });
  });

  it("ignores a drop with no file in it", () => {
    expect(droppedUpload([])).toBeNull();
  });
});
