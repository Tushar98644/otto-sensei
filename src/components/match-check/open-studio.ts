import { roomForResume } from "@/components/account/pro-tools";
import { handOffUpload } from "@/components/studio/upload/upload-handoff";
import { flushStudio, useStudioStore } from "@/lib/store/resume-store";

// Same as the dashboard's upload button: room for the resume first, then the studio opens on Upload with the file.
export async function openStudioWithFile(file: File): Promise<boolean> {
  // A write before the saved studio loads would replace it.
  if (!useStudioStore.persist.hasHydrated()) await useStudioStore.persist.rehydrate();
  if (!(await roomForResume())) return false;
  handOffUpload(file);
  useStudioStore.getState().setStep("upload");
  flushStudio();
  return true;
}
