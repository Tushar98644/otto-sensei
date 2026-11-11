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
  // Which resume version, page size and format this file was made from.
  key: string;
  pages: number;
};

export type ResumePdf = {
  // The newest finished file. Stays up while a newer one renders, so the preview never blanks out.
  file: PdfFile | null;
  // The file matches the resume as it is right now.
  isCurrent: boolean;
  failed: boolean;
  retry: () => void;
};

// Rendering takes a few hundred milliseconds of main-thread work, so edits wait for a pause in
// typing. The first render, page size switches, format switches and look changes start right away.
const EDIT_PAUSE_MS = 600;

export function pdfKey(resume: Resume, pageSize: PdfPageSize): string {
  return `${resume.id}:${resume.updatedAt}:${pageSize}:${templateOf(resume)}`;
}

// Runs `task` when the browser is idle (soon at the latest), so it never lands mid-keystroke.
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
  // Version and look of the last finished render: decide between rendering now and waiting.
  const rendered = useRef<{ version: string; template: TemplateId; design: string } | null>(null);
  const template = templateOf(resume);
  const design = designKey(resume);

  useEffect(() => {
    const version = `${resume.id}:${resume.updatedAt}`;
    const key = pdfKey(resume, pageSize);
    const last = rendered.current;
    // Picking a format or a look also changes the version, but it is one click, not typing.
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
              // A newer edit already started its own render; this result is out of date.
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

  // Each object URL holds its PDF in memory until revoked: free the old one once a new one is
  // showing, and the last one when the step closes.
  const url = file?.url;
  useEffect(() => {
    if (!url) return;
    return () => URL.revokeObjectURL(url);
  }, [url]);

  const retry = useCallback(() => setAttempt((count) => count + 1), []);
  const key = pdfKey(resume, pageSize);
  return { file, isCurrent: file?.key === key, failed: failedKey === key, retry };
}
