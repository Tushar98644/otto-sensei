// "Write the cover letter" on a tailored copy's Download step: the Tailor step that made the copy
// writes it as its results open, so the person never has to find the button. Memory only.

let requestedFor: string | null = null;

export const APPLY_KIT_ID = "tailor-apply-kit";

export function requestLetterFor(copyId: string): void {
  requestedFor = copyId;
}

// True once, for the copy the letter was asked for.
export function takeLetterRequest(copyId: string): boolean {
  if (requestedFor !== copyId) return false;
  requestedFor = null;
  return true;
}
