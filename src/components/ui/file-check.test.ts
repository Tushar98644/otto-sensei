import { describe, expect, it } from "vitest";
import { checkFile, formatBytes } from "./file-check";

const MB = 1024 * 1024;
const RESUME = { accept: ".pdf,.docx", maxBytes: 4 * MB };

function file(name: string, size = 1000, type = "") {
  return { name, size, type };
}

describe("checkFile", () => {
  it("accepts a matching file", () => {
    expect(checkFile(file("Resume.PDF", 2 * MB, "application/pdf"), RESUME)).toBeNull();
  });

  it("accepts by extension when the browser reports no MIME type", () => {
    expect(checkFile(file("cv.docx"), RESUME)).toBeNull();
  });

  it("names the allowed kinds when the type is wrong", () => {
    expect(checkFile(file("photo.png", 1000, "image/png"), RESUME)).toBe(
      "That file type isn't supported. Choose a PDF or DOCX file.",
    );
    expect(checkFile(file("a.txt"), { accept: ".pdf, .doc, .docx" })).toBe(
      "That file type isn't supported. Choose a PDF, DOC or DOCX file.",
    );
  });

  it("matches MIME types and wildcards", () => {
    expect(checkFile(file("scan", 10, "image/jpeg"), { accept: "image/*" })).toBeNull();
    expect(checkFile(file("doc", 10, "application/pdf"), { accept: "application/pdf" })).toBeNull();
    expect(checkFile(file("doc", 10, "text/plain"), { accept: "application/pdf" })).toBe(
      "That file type isn't supported.",
    );
  });

  it("rejects empty and oversized files", () => {
    expect(checkFile(file("cv.pdf", 0), RESUME)).toBe("That file is empty. Choose another one.");
    expect(checkFile(file("cv.pdf", 4 * MB + 1), RESUME)).toBe(
      "That file is too big. The limit is 4 MB.",
    );
    expect(checkFile(file("cv.pdf", 4 * MB), RESUME)).toBeNull();
  });

  it("accepts anything when there are no rules", () => {
    expect(checkFile(file("anything.bin"), {})).toBeNull();
  });
});

describe("formatBytes", () => {
  it("uses MB from 1 MB up and KB below", () => {
    expect(formatBytes(4 * MB)).toBe("4 MB");
    expect(formatBytes(1.5 * MB)).toBe("1.5 MB");
    expect(formatBytes(500 * 1024)).toBe("500 KB");
    expect(formatBytes(10)).toBe("1 KB");
  });
});
