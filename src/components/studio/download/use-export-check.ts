"use client";

import { useEffect, useEffectEvent, useState } from "react";
import type { OttoLines } from "@/components/mascot/lines";
import { useOtto } from "@/components/mascot/use-otto";
import { useMessages } from "@/i18n/client";
import { api, isApiError } from "@/lib/api/client";
import type { RecruiterReport } from "@/lib/checks/types";
import type { Resume } from "@/lib/resume/schema";
import { useActiveReport, useStudioStore } from "@/lib/store/resume-store";
import type { PdfFile } from "./use-resume-pdf";

export type ExportCheck = {
  report: RecruiterReport | null;
  original: RecruiterReport | null;
  checking: boolean;
  error: string | null;
  // A check will start on its own once the PDF settles.
  queued: boolean;
  run: () => Promise<void>;
};

// Waits out quick format and color flips, so only the PDF someone settles on is sent.
const AUTO_CHECK_PAUSE_MS = 2_000;
// Checks have a daily per-device limit, so a long run of small changes stops checking on its own.
export const MAX_AUTO_CHECKS = 3;

function errorMessage(error: unknown, fallback: string, errors: OttoLines["errors"]): string {
  if (isApiError(error, "rate_limited")) return errors.rateLimited;
  if (isApiError(error, "network_error")) return errors.offline;
  return fallback;
}

function useOriginalReport(resume: Resume): RecruiterReport | null {
  const own = useActiveReport();
  const base = useStudioStore((s) =>
    resume.tailor ? (s.reports[resume.tailor.baseResumeId] ?? null) : null,
  );
  return own ?? base;
}

export function shouldAutoCheck(state: {
  fileKey: string | null;
  fresh: boolean;
  checking: boolean;
  failed: boolean;
  autoRuns: number;
}): boolean {
  return (
    state.fileKey !== null &&
    !state.fresh &&
    !state.checking &&
    !state.failed &&
    state.autoRuns < MAX_AUTO_CHECKS
  );
}

export function useExportCheck(
  resume: Resume,
  file: PdfFile | null,
  fileName: string,
): ExportCheck {
  const stored = useStudioStore((s) => s.exportReports[resume.id] ?? null);
  const setExportReport = useStudioStore((s) => s.setExportReport);
  const original = useOriginalReport(resume);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRuns, setAutoRuns] = useState(0);
  const failed = useMessages("studioDownload").check.failed;
  const ottoErrors = useOtto().errors;

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
      setError(errorMessage(caught, failed, ottoErrors));
    } finally {
      setChecking(false);
    }
  }

  const report = stored && stored.checkedAt >= resume.updatedAt ? stored : null;
  const fileKey = file?.key ?? null;
  const queued = shouldAutoCheck({
    fileKey,
    fresh: report !== null,
    checking,
    failed: error !== null,
    autoRuns,
  });
  const runOnItsOwn = useEffectEvent(() => {
    setAutoRuns((count) => count + 1);
    void run();
  });
  useEffect(() => {
    if (!queued) return;
    const timer = window.setTimeout(runOnItsOwn, AUTO_CHECK_PAUSE_MS);
    return () => window.clearTimeout(timer);
  }, [queued, fileKey]);

  return { report, original, checking, error, queued, run };
}
