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
