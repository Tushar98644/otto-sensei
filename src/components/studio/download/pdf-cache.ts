"use client";

import { countBlobPages } from "@/lib/pdf/pages";
import type { PdfPageSize } from "@/lib/pdf/page-size";
import { renderResumePdf } from "@/lib/pdf/render";
import { forPlan, templateOf } from "@/lib/pdf/templates";
import type { Resume } from "@/lib/resume/schema";

export type RenderedPdf = { blob: Blob; pages: number };

const MAX_FILES = 6;
const files = new Map<string, Promise<RenderedPdf>>();

export function pdfContentKey(resume: Resume, pageSize: PdfPageSize): string {
  return `${pageSize}:${templateOf(resume)}:${JSON.stringify({ ...resume, updatedAt: 0 })}`;
}

export function printedResume(resume: Resume, pro: boolean | null): Resume {
  return pro === false ? forPlan(resume, "free") : resume;
}

export function renderPdfCached(resume: Resume, pageSize: PdfPageSize): Promise<RenderedPdf> {
  const key = pdfContentKey(resume, pageSize);
  const hit = files.get(key);
  if (hit) {
    files.delete(key);
    files.set(key, hit);
    return hit;
  }
  const made = renderResumePdf(resume, { pageSize, template: templateOf(resume) }).then(
    async (blob) => ({ blob, pages: await countBlobPages(blob) }),
  );
  files.set(key, made);
  made.catch(() => {
    if (files.get(key) === made) files.delete(key);
  });
  while (files.size > MAX_FILES) files.delete(files.keys().next().value as string);
  return made;
}

export function preparePdf(resume: Resume, pageSize: PdfPageSize): () => void {
  if (files.has(pdfContentKey(resume, pageSize))) return () => {};
  const run = () => void renderPdfCached(resume, pageSize).catch(() => undefined);
  if (typeof window.requestIdleCallback === "function") {
    const handle = window.requestIdleCallback(run, { timeout: 1000 });
    return () => window.cancelIdleCallback(handle);
  }
  const handle = window.setTimeout(run, 0);
  return () => window.clearTimeout(handle);
}

export function clearPdfCacheForTests(): void {
  files.clear();
}
