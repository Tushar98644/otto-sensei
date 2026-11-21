import { handOffUpload } from "@/components/studio/upload/upload-handoff";
import { flushStudio, useStudioStore } from "@/lib/store/resume-store";

// A write before the saved studio loads would replace it.
export async function loadStudio(): Promise<void> {
  if (!useStudioStore.persist.hasHydrated()) await useStudioStore.persist.rehydrate();
}

// The studio opens on Upload with the file, and Upload asks for room itself, so the caller needn't load the upgrade dialog.
export async function handFileToStudio(file: File): Promise<void> {
  await loadStudio();
  handOffUpload(file);
  useStudioStore.getState().setStep("upload");
  flushStudio();
}
