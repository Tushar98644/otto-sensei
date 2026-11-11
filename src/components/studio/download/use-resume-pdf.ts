"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { designKey } from "@/lib/pdf/design";
import type { PdfPageSize } from "@/lib/pdf/page-size";
import { templateOf } from "@/lib/pdf/templates";
import type { Resume, TemplateId } from "@/lib/resume/schema";
import { renderPdfCached } from "./pdf-cache";

export type PdfFile = {
  blob: Blob;
  url: string;
  key: string;
  pages: number;
};

export type ResumePdf = {
  file: PdfFile | null;
  isCurrent: boolean;
  failed: boolean;
  retry: () => void;
};

const EDIT_PAUSE_MS = 600;

export function pdfKey(resume: Resume, pageSize: PdfPageSize): string {
  return `${resume.id}:${resume.updatedAt}:${pageSize}:${templateOf(resume)}`;
}

function whenIdle(task: () => void): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const handle = window.requestIdleCallback(task, { timeout: 1000 });
    return () => window.cancelIdleCallback(handle);
  }
  const handle = window.setTimeout(task, 0);
  return () => window.clearTimeout(handle);
}

export function useResumePdf(resume: Resume, pageSize: PdfPageSize): ResumePdf {
  const [file, setFile] = useState<PdfFile | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const rendered = useRef<{ version: string; template: TemplateId; design: string } | null>(null);
  const template = templateOf(resume);
  const design = designKey(resume);

  useEffect(() => {
    const version = `${resume.id}:${resume.updatedAt}`;
    const key = pdfKey(resume, pageSize);
    const last = rendered.current;
    const waitForPause =
      last !== null &&
      last.version !== version &&
      last.template === template &&
      last.design === design;
    let cancelled = false;
    let cancelIdle = () => {};
    const timer = window.setTimeout(
      () => {
        cancelIdle = whenIdle(() => {
          renderPdfCached(resume, pageSize).then(
            ({ blob, pages }) => {
              if (cancelled) return;
              rendered.current = { version, template, design };
              setFile({ blob, key, pages, url: URL.createObjectURL(blob) });
              setFailedKey(null);
            },
            (error: unknown) => {
              if (cancelled) return;
              console.error("PDF render failed", error);
              setFailedKey(key);
            },
          );
        });
      },
      waitForPause ? EDIT_PAUSE_MS : 0,
    );
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      cancelIdle();
    };
  }, [resume, pageSize, template, design, attempt]);

  const url = file?.url;
  useEffect(() => {
    if (!url) return;
    return () => URL.revokeObjectURL(url);
  }, [url]);

  const retry = useCallback(() => setAttempt((count) => count + 1), []);
  const key = pdfKey(resume, pageSize);
  return { file, isCurrent: file?.key === key, failed: failedKey === key, retry };
}
