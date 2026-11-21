import { roomForResume } from "@/components/account/pro-tools";
import { setTailorDraft, type TailorDraft } from "@/components/studio/tailor/session";
import { openSample } from "@/components/studio/upload/sample-start";
import { track } from "@/lib/analytics/client";
import { flushStudio, useStudioStore } from "@/lib/store/resume-store";
import { handFileToStudio, loadStudio } from "./hand-off-file";

export type StudioHandoff = { job: TailorDraft } & (
  { file: File } | { text: string; sample: boolean }
);

// Same as the dashboard's upload button: room for the resume first, then the studio opens on Upload with the file.
export async function openStudioWithFile(file: File, retry?: () => void): Promise<boolean> {
  await loadStudio();
  if (!(await roomForResume(retry))) return false;
  await handFileToStudio(file);
  return true;
}

// Pasted text goes through the upload's rule-based reader and opens on Fix; the job post waits in Tailor.
export async function openStudioWith(handoff: StudioHandoff, retry?: () => void): Promise<boolean> {
  if ("file" in handoff) {
    if (!(await openStudioWithFile(handoff.file, retry))) return false;
    setTailorDraft(handoff.job);
    return true;
  }
  await loadStudio();
  // The sample has a slot of its own, so it never needs room for another resume.
  if (!handoff.sample && !(await roomForResume(retry))) return false;
  const { addResume, setStep } = useStudioStore.getState();
  if (handoff.sample) {
    if (openSample().created) track("resume_imported", { source: "sample" });
  } else {
    const { heuristicParse } = await import("@/lib/resume/heuristic-parse");
    addResume(heuristicParse(handoff.text));
    track("resume_imported", { source: "paste" });
  }
  setStep("fix");
  setTailorDraft(handoff.job);
  flushStudio();
  return true;
}
