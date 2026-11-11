import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSampleResume } from "@/lib/resume/sample";
import { withTemplate } from "@/lib/pdf/templates";

const render = vi.hoisted(() => vi.fn(async () => new Blob(["%PDF"], { type: "application/pdf" })));
vi.mock("@/lib/pdf/render", () => ({ renderResumePdf: render }));
vi.mock("@/lib/pdf/pages", () => ({ countBlobPages: async () => 1 }));

const { clearPdfCacheForTests, pdfContentKey, renderPdfCached } = await import("./pdf-cache");

describe("renderPdfCached", () => {
  beforeEach(() => {
    clearPdfCacheForTests();
    render.mockClear();
  });

  it("reuses a file made ahead when only the save time changed, as picking a format does", async () => {
    const resume = withTemplate(createSampleResume(), "modern");
    const ahead = renderPdfCached(resume, "LETTER");
    const afterClick = renderPdfCached(
      { ...resume, updatedAt: resume.updatedAt + 5_000 },
      "LETTER",
    );
    expect(afterClick).toBe(ahead);
    await afterClick;
    expect(render).toHaveBeenCalledTimes(1);
  });

  it("renders again for a different format, page size or edit", () => {
    const resume = createSampleResume();
    const key = pdfContentKey(resume, "LETTER");
    expect(pdfContentKey(resume, "A4")).not.toBe(key);
    expect(pdfContentKey(withTemplate(resume, "compact"), "LETTER")).not.toBe(key);
    expect(pdfContentKey({ ...resume, title: `${resume.title} 2` }, "LETTER")).not.toBe(key);
  });

  it("drops a failed render so the next try renders again", async () => {
    const resume = createSampleResume();
    render.mockRejectedValueOnce(new Error("boom"));
    await expect(renderPdfCached(resume, "LETTER")).rejects.toThrow("boom");
    await renderPdfCached(resume, "LETTER");
    expect(render).toHaveBeenCalledTimes(2);
  });
});
