"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { unlockProTool } from "@/components/account/pro-tools";
import { ROUTES } from "@/components/site/routes";
import { isProTemplate, templateOf, withTemplate } from "@/lib/pdf/templates";
import type { Resume, TemplateId } from "@/lib/resume/schema";
import { useStudioHydrated, useStudioStore } from "@/lib/store/resume-store";
import { formatTarget, sampleWithFormat } from "./apply-format";

export type ApplyFormat = {
  ready: boolean;
  target: Resume | null;
  opening: TemplateId | null;
  apply: (id: TemplateId) => Promise<void>;
};

export function useApplyFormat(): ApplyFormat {
  const router = useRouter();
  const ready = useStudioHydrated();
  const target = useStudioStore(formatTarget);
  const [opening, setOpening] = useState<TemplateId | null>(null);

  useEffect(() => {
    router.prefetch(ROUTES.studio);
  }, [router]);

  const apply = useCallback(
    async (id: TemplateId) => {
      setOpening(id);
      if (isProTemplate(id) && !(await unlockProTool("formats"))) {
        setOpening(null);
        return;
      }
      // Read at click time: cloud sync may have changed the list since the last render.
      const store = useStudioStore.getState();
      const resume = formatTarget(store);
      if (resume) {
        if (store.activeId !== resume.id) store.setActive(resume.id);
        if (templateOf(resume) !== id) store.updateResume(resume.id, (r) => withTemplate(r, id));
      } else {
        store.addResume(sampleWithFormat(id));
      }
      store.setStep("download");
      router.push(ROUTES.studio);
    },
    [router],
  );

  return { ready, target, opening, apply };
}
