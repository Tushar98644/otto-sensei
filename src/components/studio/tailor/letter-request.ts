let requestedFor: string | null = null;

export const APPLY_KIT_ID = "tailor-apply-kit";

export function requestLetterFor(copyId: string): void {
  requestedFor = copyId;
}

export function takeLetterRequest(copyId: string): boolean {
  if (requestedFor !== copyId) return false;
  requestedFor = null;
  return true;
}
