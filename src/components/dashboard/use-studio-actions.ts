"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { roomForResume } from "@/components/account/pro-tools";
import { OTTO } from "@/components/mascot/lines";
import { ROUTES } from "@/components/site/routes";
import { requestGuidedDraft } from "@/components/studio/upload/guided-start";
import {
  LOCAL_IMPORT_ACCEPT,
  type LocalImportKind,
} from "@/components/studio/upload/local-import-kinds";
import { toast } from "@/components/ui/toast";
import { track } from "@/lib/analytics/client";
import { useStudioStore, type StudioStep } from "@/lib/store/resume-store";
import { createSampleResume } from "@/lib/resume/sample";
import { emptyResume } from "@/lib/resume/schema";

// Opens the browser's file picker without a file input in the page. The input joins the document
// while the picker is open, because some mobile browsers ignore a click on a detached one.
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

// Every dashboard button that leads into the studio: set the active resume and step in the store
// (the studio reads both on arrival), then go there. Same starts as the studio's upload screen,
// and the same check first that Free has room for another resume.
export function useStudioActions() {
  const router = useRouter();
  const setActive = useStudioStore((s) => s.setActive);
  const setStep = useStudioStore((s) => s.setStep);
  const addResume = useStudioStore((s) => s.addResume);

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

  // A LinkedIn export or a JSON Resume file, read in this browser like on the studio's upload
  // screen. The file is picked first and the room checked after, as there: the picker must open
  // inside the click.
  const importLocal = useCallback(
    (kind: LocalImportKind) =>
      chooseFile(LOCAL_IMPORT_ACCEPT[kind], (file) => {
        void (async () => {
          if (!(await roomForResume())) return;
          // Loaded on use: the LinkedIn reader brings a ZIP library most visits never need.
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
      upload: () =>
        void roomForResume().then((room) => {
          if (room) go("upload");
        }),
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
    [addResume, go, importLocal, open],
  );
}

export type StudioActions = ReturnType<typeof useStudioActions>;
