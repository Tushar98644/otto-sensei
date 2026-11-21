"use client";

import { useEffect, useMemo, useState } from "react";
import { useProTools } from "@/components/account/pro-tools";
import { useSessionUserId } from "@/components/account/session-user";
import { useSetupChecklist, type SetupChecklist } from "@/components/setup/use-setup-checklist";
import { loadDraft, loadResult } from "@/components/studio/tailor/session";
import { useNow } from "@/components/studio/use-now";
import { useAppQueryClient } from "@/lib/queries/client";
import type { Resume } from "@/lib/resume/schema";
import { useResumeList, useStudioStore } from "@/lib/store/resume-store";
import { useApplications } from "../applications/use-applications";
import { fixTarget, nextSteps, type MatchCounts, type NextStep } from "./next-steps";
import { tailorSource, unfinishedTailor } from "./tailor-draft";

export type UpNext = {
  steps: NextStep[];
  setup: SetupChecklist | null;
  remember: SetupChecklist["remember"];
};

function useMatchCounts(enabled: boolean, resumes: readonly Resume[], own: readonly Resume[]) {
  const client = useAppQueryClient();
  const userId = useSessionUserId();
  const [counts, setCounts] = useState<MatchCounts | null>(null);

  useEffect(() => {
    if (!enabled || !userId) return;
    let live = true;
    const ids = new Set(own.map((resume) => resume.id));
    import("./load-matches")
      .then(({ loadMatchCounts }) => loadMatchCounts(client, userId, resumes, ids))
      .then((found) => {
        if (live) setCounts(found);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [enabled, userId, client, resumes, own]);

  return enabled ? counts : null;
}

export function useUpNext(): UpNext | null {
  const checklist = useSetupChecklist();
  const pro = useProTools();
  const resumes = useResumeList();
  const activeId = useStudioStore((s) => s.activeId);
  const applications = useApplications();
  const now = useNow();
  const own = useMemo(() => checklist?.own ?? [], [checklist?.own]);
  const ready = checklist !== null && applications.status !== "loading" && now > 0;
  const matches = useMatchCounts(ready && pro === true && own.length > 0, resumes, own);

  const setupLine =
    checklist?.shown && checklist.weakLine.status === "open" ? checklist.weakLine.target : null;
  const fix = useMemo(() => (ready ? fixTarget(own, setupLine) : null), [ready, own, setupLine]);
  // The tailor draft lives in this tab's session storage, read only once the page is on the client.
  const tailor = useMemo(() => {
    if (!ready) return null;
    const source = tailorSource(resumes, activeId);
    if (!source || !own.some((resume) => resume.id === source.id)) return null;
    return unfinishedTailor({ source, draft: loadDraft(), last: loadResult(source.id) });
  }, [ready, resumes, own, activeId]);

  if (!ready) return null;
  const setup = checklist.shown ? checklist : null;
  return {
    steps: nextSteps({
      now,
      ownResumes: own.length,
      applications: applications.status === "ready" ? applications.items : [],
      fix,
      tailor,
      setup: setup ? { items: setup.items, weakLine: setup.weakLine.status } : null,
      matches,
    }),
    setup,
    remember: checklist.remember,
  };
}
