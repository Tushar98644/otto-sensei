import type { LocalSave } from "@/lib/store/studio-storage";
import type { Backup } from "@/lib/sync/cloud-sync";

export type SaveState = "saving" | "saved" | "device" | "local" | "retrying" | "unsaved";

export type SaveProblem = Extract<SaveState, "retrying" | "unsaved">;

// The account's copy is the one that counts once there is one; this browser's is the fallback.
export function saveState(local: LocalSave, backup: Backup, signedIn: boolean): SaveState {
  if (local === "pending") return "saving";
  if (!signedIn) return local === "failed" ? "unsaved" : "device";
  if (backup === "saving") return "saving";
  if (backup === "saved") return "saved";
  if (local === "failed") return "unsaved";
  return backup === "failed" ? "retrying" : "local";
}

export function isSaveProblem(state: SaveState): state is SaveProblem {
  return state === "retrying" || state === "unsaved";
}

export const SAVE_COPY: Record<SaveState, { label: string; detail: string }> = {
  saving: { label: "Saving…", detail: "Saving your latest edits." },
  saved: { label: "Saved", detail: "Saved and backed up to your account." },
  device: { label: "Saved on this device", detail: "Sign in to back it up to your account." },
  local: { label: "Saved on this device", detail: "This resume isn't backed up to your account." },
  retrying: {
    label: "Not backed up",
    detail: "Saved on this device. The backup tries again on its own.",
  },
  unsaved: {
    label: "Not saved",
    detail: "This browser isn't letting the studio save. Download your resume to keep these edits.",
  },
};
