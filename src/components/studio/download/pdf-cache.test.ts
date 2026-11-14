import { beforeEach, describe, expect, it, vi } from "vitest";
import { fitCandidates, hideLines, planFit } from "@/lib/pdf/fit";
import { withTemplate } from "@/lib/pdf/templates";
import { touch } from "@/lib/resume/ops";
import { createSampleResume } from "@/lib/resume/sample";
import type { Resume } from "@/lib/resume/schema";

const render = vi.hoisted(() =>
  vi.fn<(resume: Resume) => Promise<Blob>>(
    async () => new Blob(["%PDF"], { type: "application/pdf" }),
  ),
);
vi.mock("@/lib/pdf/render", () => ({ renderResumePdf: render }));
vi.mock("@/lib/pdf/pages", () => ({
  countBlobPages: async (blob: Blob) => Number(await blob.text()) || 1,
}));

const { clearPdfCacheForTests, pdfContentKey, printedResume, renderPdfCached } =
  await import("./pdf-cache");

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

describe("fit planning on the cache", () => {
  const hiddenCount = (resume: Resume) =>
    resume.experience.flatMap((job) => job.bullets).filter((bullet) => bullet.hidden).length;

  beforeEach(() => {
    clearPdfCacheForTests();
    render.mockClear();
    // Two pages until three lines are hidden.
    render.mockImplementation(async (resume) => new Blob([hiddenCount(resume) >= 3 ? "1" : "2"]));
  });

  it.each([
    { plan: "Pro", stored: createSampleResume(), pro: true },
    {
      plan: "Free with a Pro format",
      stored: withTemplate(createSampleResume(), "modern"),
      pro: false,
    },
  ])("shows the preview after Hide from the probe that fit ($plan)", async ({ stored, pro }) => {
    const printed = printedResume(stored, pro);
    const pagesOf = async (candidate: Resume) => (await renderPdfCached(candidate, "LETTER")).pages;
    const lines = fitCandidates(printed);
    const plan = await planFit(printed, lines, pagesOf);
    expect(plan).toEqual({ count: 3, fits: true });
    const probes = render.mock.calls.length;
    expect(probes).toBeLessThanOrEqual(1 + Math.ceil(Math.log2(lines.length)));

    const ids = new Set(lines.slice(0, plan.count).map((line) => line.bulletId));
    const afterHide = touch(hideLines(stored, ids), stored.updatedAt + 1_000);
    expect((await renderPdfCached(printedResume(afterHide, pro), "LETTER")).pages).toBe(1);
    expect(render).toHaveBeenCalledTimes(probes);

    await planFit(printed, lines, pagesOf);
    expect(render).toHaveBeenCalledTimes(probes);
  });
});
