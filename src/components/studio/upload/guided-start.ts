// "Build with Otto" from outside the studio (the New resume menu, Home): the upload step opens on
// the questions instead of the dropzone. Read when the step mounts, cleared once it has.

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
