import { describe, expect, it } from "vitest";
import { pdfFileFor } from "./use-resume-pdf";

describe("pdfFileFor", () => {
  it("keeps the URL when the cache hands back the file already shown", () => {
    const blob = new Blob(["%PDF"], { type: "application/pdf" });
    const shown = pdfFileFor(null, { blob, pages: 1 }, "resume-1:1:LETTER:classic");
    const again = pdfFileFor(shown, { blob, pages: 1 }, "resume-1:2:LETTER:classic");
    expect(again).toEqual({ ...shown, key: "resume-1:2:LETTER:classic" });
    URL.revokeObjectURL(shown.url);
  });

  it("makes a new URL for a different file", () => {
    const first = new Blob(["%PDF one"], { type: "application/pdf" });
    const second = new Blob(["%PDF two"], { type: "application/pdf" });
    const shown = pdfFileFor(null, { blob: first, pages: 1 }, "a");
    const next = pdfFileFor(shown, { blob: second, pages: 2 }, "b");
    expect(next).toMatchObject({ blob: second, pages: 2, key: "b" });
    expect(next.url).not.toBe(shown.url);
    URL.revokeObjectURL(shown.url);
    URL.revokeObjectURL(next.url);
  });
});
