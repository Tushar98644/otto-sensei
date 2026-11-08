// The tailored copy just made in the Tailor step. The Download step it opens cheers once for it;
// opening that copy again later doesn't.
let freshId: string | null = null;

export function noteFreshCopy(id: string): void {
  freshId = id;
}

export function isFreshCopy(id: string): boolean {
  return freshId === id;
}

export function forgetFreshCopy(): void {
  freshId = null;
}
