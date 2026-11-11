let requested = false;

export function requestGuidedDraft(): void {
  requested = true;
}

export function guidedDraftRequested(): boolean {
  return requested;
}

export function clearGuidedDraft(): void {
  requested = false;
}
