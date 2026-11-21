"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import {
  askForResumeRoom,
  noRoomForResume,
  roomForResume,
  unlockFeature,
  useProTools,
} from "@/components/account/pro-tools";
import { OTTO } from "@/components/mascot/lines";
import { ROUTES } from "@/components/site/routes";
import { requestGuidedDraft } from "@/components/studio/upload/guided-start";
import { openSample } from "@/components/studio/upload/sample-start";
import { handOffUpload, UPLOAD_ACCEPT } from "@/components/studio/upload/upload-handoff";
import {
  LOCAL_IMPORT_ACCEPT,
  type LocalImportKind,
} from "@/components/studio/upload/local-import-kinds";
import { toast } from "@/components/ui/toast";
import { track } from "@/lib/analytics/client";
import { useStudioStore, type StudioStep } from "@/lib/store/resume-store";
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
      chooseFile(LOCAL_IMPORT_ACCEPT[kind], function read(file) {
        void (async () => {
          if (!(await roomForResume(() => read(file)))) return;
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
        const handOff = (file: File) => {
          handOffUpload(file);
          go("upload");
        };
        if (pro === false && noRoomForResume()) {
          // "Replace it" opens the picker in its own click; the old resume goes once a file is chosen.
          askForResumeRoom((replaceOld) =>
            chooseFile(UPLOAD_ACCEPT, (file) => {
              if (replaceOld()) handOff(file);
            }),
          );
          return;
        }
        chooseFile(UPLOAD_ACCEPT, (file) => {
          void roomForResume(() => handOff(file)).then((room) => {
            if (room) handOff(file);
          });
        });
      },
      // Free has no drafts, so the trial is offered before the questions, not after them.
      guided: () =>
        void (async () => {
          if (!(await unlockFeature("draft")) || !(await roomForResume())) return;
          requestGuidedDraft();
          go("upload");
        })(),
      linkedin: () => importLocal("linkedin"),
      jsonResume: () => importLocal("jsonresume"),
      scratch: () => {
        const start = () => {
          addResume(emptyResume());
          go("fix");
        };
        void roomForResume(start).then((room) => {
          if (room) start();
        });
      },
      sample: () => {
        openSample();
        go("fix");
      },
    }),
    [addResume, go, importLocal, open, pro],
  );
}

export type StudioActions = ReturnType<typeof useStudioActions>;
