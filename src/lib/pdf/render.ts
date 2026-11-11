import { createElement } from "react";
import type { Resume, TemplateId } from "@/lib/resume/schema";
import type { PdfPageSize } from "./page-size";

// react-pdf is large, so it's imported only when a PDF is actually needed.

export type RenderPdfOptions = { pageSize?: PdfPageSize; template?: TemplateId };

// Only stops a stuck render from leaving a spinner up forever.
const RENDER_TIMEOUT_MS = 20_000;

function loadRenderer() {
  return Promise.all([import("@react-pdf/renderer"), import("@/components/pdf/resume-pdf")]);
}

// Failures are ignored here; renderResumePdf() retries and reports them.
export function preloadPdfRenderer(): void {
  loadRenderer().catch(() => undefined);
}

export async function renderResumePdf(
  resume: Resume,
  { pageSize = "LETTER", template }: RenderPdfOptions = {},
): Promise<Blob> {
  const [{ pdf }, { ResumePdf }] = await loadRenderer();
  const instance = pdf();
  instance.updateContainer(createElement(ResumePdf, { resume, pageSize, template }));
  return withTimeout(instance.toBlob(), RENDER_TIMEOUT_MS);
}

export type RenderLetterOptions = RenderPdfOptions & { now?: number };

export async function renderLetterPdf(
  resume: Resume,
  letter: string,
  { pageSize = "LETTER", template, now = Date.now() }: RenderLetterOptions = {},
): Promise<Blob> {
  const [{ pdf }, { LetterPdf }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/components/pdf/letter-pdf"),
  ]);
  const instance = pdf();
  instance.updateContainer(createElement(LetterPdf, { resume, letter, pageSize, template, now }));
  return withTimeout(instance.toBlob(), RENDER_TIMEOUT_MS);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("PDF render timed out")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
