"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import { roomForResume, useProTools } from "@/components/account/pro-tools";
import { openUpgradePrompt } from "@/components/account/upgrade-prompt";
import { OTTO } from "@/components/mascot/lines";
import { ROUTES } from "@/components/site/routes";
import { requestGuidedDraft } from "@/components/studio/upload/guided-start";
import { handOffUpload, UPLOAD_ACCEPT } from "@/components/studio/upload/upload-handoff";
import {
  LOCAL_IMPORT_ACCEPT,
  type LocalImportKind,
} from "@/components/studio/upload/local-import-kinds";
import { toast } from "@/components/ui/toast";
import { RESUME_LIMITS } from "@/config/plans";
import { track } from "@/lib/analytics/client";
import { useStudioStore, type StudioStep } from "@/lib/store/resume-store";
import { createSampleResume } from "@/lib/resume/sample";
import { emptyResume } from "@/lib/resume/schema";

// Some mobile browsers ignore a click on a detached input, so it joins the document meanwhile.
function chooseFile(accept: string, onFile: (file: File) => void): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = accept;
  input.hidden = true;
  const done = () => input.remove();
  input.addEventListener("cancel", done, { once: true });
  input.addEventListener(
    "change",
    () => {
      const file = input.files?.[0];
      done();
      if (file) onFile(file);
    },
    { once: true },
  );
  document.body.append(input);
  input.click();
}

export function useStudioActions() {
  const router = useRouter();
  const setActive = useStudioStore((s) => s.setActive);
  const setStep = useStudioStore((s) => s.setStep);
  const addResume = useStudioStore((s) => s.addResume);
  const pro = useProTools();

  useEffect(() => {
    router.prefetch(ROUTES.studio);
  }, [router]);

  const go = useCallback(
    (step: StudioStep) => {
      setStep(step);
      router.push(ROUTES.studio);
    },
    [router, setStep],
  );

  const open = useCallback(
    (id: string, step: StudioStep) => {
      setActive(id);
      go(step);
    },
    [go, setActive],
  );

  // The picker must open inside the click, so the room is checked after the file is picked.
  const importLocal = useCallback(
    (kind: LocalImportKind) =>
      chooseFile(LOCAL_IMPORT_ACCEPT[kind], (file) => {
        void (async () => {
          if (!(await roomForResume())) return;
          const { LocalImportError, readLocalImport } =
            await import("@/components/studio/upload/local-import");
          try {
            const resume = await readLocalImport(kind, file);
            addResume(resume);
            track("resume_imported", { source: kind });
            go("fix");
          } catch (error) {
            toast({
              title: "Couldn't import that file",
              description: error instanceof LocalImportError ? error.message : OTTO.errors.generic,
              variant: "error",
            });
          }
        })();
      }),
    [addResume, go],
  );

  return useMemo(
    () => ({
      open,
      upload: () => {
        if (pro === false && useStudioStore.getState().order.length >= RESUME_LIMITS.free) {
          openUpgradePrompt("resumes");
          return;
        }
        chooseFile(UPLOAD_ACCEPT, (file) => {
          void roomForResume().then((room) => {
            if (!room) return;
            handOffUpload(file);
            go("upload");
          });
        });
      },
      guided: () =>
        void roomForResume().then((room) => {
          if (!room) return;
          requestGuidedDraft();
          go("upload");
        }),
      linkedin: () => importLocal("linkedin"),
      jsonResume: () => importLocal("jsonresume"),
      scratch: () =>
        void roomForResume().then((room) => {
          if (!room) return;
          addResume(emptyResume());
          go("fix");
        }),
      sample: () =>
        void roomForResume().then((room) => {
          if (!room) return;
          addResume(createSampleResume());
          go("fix");
        }),
    }),
    [addResume, go, importLocal, open, pro],
  );
}

export type StudioActions = ReturnType<typeof useStudioActions>;
