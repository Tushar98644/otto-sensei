"use client";

import { useState } from "react";
import { OTTO } from "@/components/mascot/lines";
import { api, isApiError } from "@/lib/api/client";
import type { RecruiterReport } from "@/lib/checks/types";
import type { Resume } from "@/lib/resume/schema";
import { useActiveReport, useStudioStore } from "@/lib/store/resume-store";
import type { PdfFile } from "./use-resume-pdf";

export type ExportCheck = {
  // The check of the exported PDF, only while it still matches the resume.
  report: RecruiterReport | null;
  // The report of the file the user first uploaded, for "before vs after".
  original: RecruiterReport | null;
  checking: boolean;
  error: string | null;
  run: () => Promise<void>;
};

function errorMessage(error: unknown): string {
  if (isApiError(error, "rate_limited")) return OTTO.errors.rateLimited;
  if (isApiError(error, "network_error")) return OTTO.errors.offline;
  return "I couldn't check your PDF just now. Try again in a minute.";
}

// A tailored copy has no upload of its own, so it compares against the resume it was made from.
function useOriginalReport(resume: Resume): RecruiterReport | null {
  const own = useActiveReport();
  const base = useStudioStore((s) =>
    resume.tailor ? (s.reports[resume.tailor.baseResumeId] ?? null) : null,
  );
  return own ?? base;
}

export function useExportCheck(resume: Resume, file: PdfFile | null, fileName: string): ExportCheck {
  const stored = useStudioStore((s) => s.exportReports[resume.id] ?? null);
  const setExportReport = useStudioStore((s) => s.setExportReport);
  const original = useOriginalReport(resume);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!file || checking) return;
    // Browser time, like resume.updatedAt, so the freshness test below never mixes two clocks.
    const startedAt = Date.now();
    setChecking(true);
    setError(null);
    try {
      const { report } = await api.checkFile(file.blob, fileName);
      setExportReport(resume.id, { ...report, checkedAt: startedAt });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setChecking(false);
    }
  }

  // Any edit after the check started makes the result describe an older PDF.
  const report = stored && stored.checkedAt >= resume.updatedAt ? stored : null;
  return { report, original, checking, error, run };
}
