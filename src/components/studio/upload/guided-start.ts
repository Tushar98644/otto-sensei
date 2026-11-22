import { lazyComponent } from "@/components/ui/lazy";

let requested = false;

// The form loads with the request, so the studio opens on it without a wait.
export const guidedDraftLoader = lazyComponent(() =>
  import("./guided-draft").then((m) => m.GuidedDraft),
);

export function requestGuidedDraft(): void {
  requested = true;
  void guidedDraftLoader.load().catch(() => {});
}

export function guidedDraftRequested(): boolean {
  return requested;
}

export function clearGuidedDraft(): void {
  requested = false;
}
